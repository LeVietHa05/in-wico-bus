# ESP32 API Reference

Base URL: `http://<server>/api/esp32`

## `POST /api/esp32/gps`

Send real-time GPS coordinates from the bus.

### Request Body

```json
{
  "routeId": "string (required)",
  "lat": "number (required)",
  "lng": "number (required)",
  "routeHistoryId": "string (optional)"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `routeId` | string | Yes | ID of the route being driven |
| `lat` | number | Yes | Latitude (WGS84) |
| `lng` | number | Yes | Longitude (WGS84) |
| `routeHistoryId` | string | No | Active trip ID. If provided, the server checks for stop arrival |

### Response (200)

```json
{
  "success": true,
  "data": {
    "routeId": "...",
    "lat": 21.0285,
    "lng": 105.8542,
    "timestamp": "2026-06-13T12:00:00.000Z"
  },
  "stopArrival": {
    "stopIndex": 2,
    "stopName": "Ngã Tư Sở",
    "arrivalTime": "2026-06-13T12:00:00.000Z"
  }
}
```

- `stopArrival` is `null` unless the bus is within ~50m of an unvisited stop **and** `routeHistoryId` is provided.

### Errors

| Status | Meaning |
|---|---|
| 400 | Missing `routeId`, `lat`, or `lng` |

---

## `POST /api/esp32/rfid`

Record an RFID student scan on the bus (attendance).

### Request Body

```json
{
  "routeHistoryId": "string (required)",
  "rfidTag": "string (required)"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `routeHistoryId` | string | Yes | Active trip ID from navigation start |
| `rfidTag` | string | Yes | Student's RFID tag registered in the system |

### Response (200)

```json
{
  "success": true,
  "data": {
    "studentId": "stu_abc123",
    "routeHistoryId": "...",
    "studentName": "Nguyễn Văn A",
    "isPresent": true,
    "timestamp": "2026-06-13T12:05:00.000Z"
  }
}
```

### Errors

| Status | Meaning |
|---|---|
| 400 | Missing `routeHistoryId` or `rfidTag` |
| 404 | Route history not found (no active navigation) |
| 404 | Unknown RFID tag |

---

## `POST /api/navigation` (Start/Stop Trip)

Used to begin or end a bus trip. The ESP32 typically does **not** call this directly — it is called from the Dashboard or Simulate page — but it is required to obtain a `routeHistoryId` before sending RFID scans.

### Start

```json
{ "action": "start", "routeId": "route_xyz" }
```

Response (200):

```json
{
  "data": {
    "id": "rh_uuid",
    "routeId": "route_xyz",
    "startTime": "2026-06-13T12:00:00.000Z",
    "endTime": null,
    "attendanceStr": "0/25",
    "stopsProgress": [
      { "stopId": "...", "name": "Bến xe Mỹ Đình", "arrivalTime": null },
      { "stopId": "...", "name": "Ngã Tư Sở", "arrivalTime": null }
    ],
    "status": "running"
  }
}
```

The returned `id` is used as `routeHistoryId` for subsequent GPS and RFID calls.

### Stop

```json
{ "action": "stop" }
```

Response (200): finalised `RouteHistory` with `endTime`, updated attendance, `status: "end"`.

---

## `GET /api/navigation`

Poll current navigation state (used by the dashboard; optional for ESP32).

Response includes: `navState`, `routeHistory`, `currentGPS`, `attendance`, `routePath`, `nextStopGuidance`.

---

## Typical ESP32 Flow

```
1. (External — Dashboard or Simulate)
   POST /api/navigation  { action: "start", routeId: "..." }
   → save routeHistoryId

2. Loop every 3–5 seconds:
   POST /api/esp32/gps  { routeId, routeHistoryId, lat, lng }
   → see stopArrival in response

3. On RFID scan:
   POST /api/esp32/rfid  { routeHistoryId, rfidTag }
   → student marked present

4. (External — Dashboard or Simulate)
   POST /api/navigation  { action: "stop" }
   → trip finalised, persisted to Google Sheets
```

### Arduino / ESP32 Sketch Skeleton

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "...";
const char* password = "...";
const char* server = "http://your-server.com";
String routeHistoryId; // obtained after start

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
}

void sendGPS(float lat, float lng, String routeId) {
  HTTPClient http;
  http.begin(String(server) + "/api/esp32/gps");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["routeId"] = routeId;
  doc["lat"] = lat;
  doc["lng"] = lng;
  if (routeHistoryId.length() > 0) doc["routeHistoryId"] = routeHistoryId;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);

  if (code == 200) {
    DeserializationError err = deserializeJson(doc, http.getString());
    if (!err && doc["stopArrival"].is<JsonObject>()) {
      Serial.printf("Arrived at stop %s\n", doc["stopArrival"]["stopName"].as<const char*>());
    }
  }
  http.end();
}

void sendRFID(String tag) {
  HTTPClient http;
  http.begin(String(server) + "/api/esp32/rfid");
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["routeHistoryId"] = routeHistoryId;
  doc["rfidTag"] = tag;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);

  if (code == 200) {
    Serial.println("RFID recorded");
  } else {
    Serial.printf("RFID error: %d\n", code);
  }
  http.end();
}
```
