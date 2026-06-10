import { google, sheets_v4 } from 'googleapis';
import { BusRoute, Student, RouteHistory } from './types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient: sheets_v4.Resource$Spreadsheets | null = null;

function getClient(): sheets_v4.Resource$Spreadsheets {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: 'v4', auth }).spreadsheets;
  return sheetsClient;
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID not set');
  return id;
}

async function ensureSheet(name: string): Promise<void> {
  const client = getClient();
  const res = await client.get({ spreadsheetId: sheetId() });
  const sheets = res.data.sheets || [];
  const exists = sheets.some((s) => s.properties?.title === name);
  if (!exists) {
    await client.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: {
        requests: [{ addSheet: { properties: { title: name } } }],
      },
    });
  }
}

async function readSheet<T>(name: string, mapper: (row: string[]) => T): Promise<T[]> {
  const client = getClient();
  await ensureSheet(name);
  const res = await client.values.get({
    spreadsheetId: sheetId(),
    range: `${name}!A:Z`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  return rows.slice(1).map((row) => mapper(row));
}

async function writeSheet(name: string, headers: string[], data: string[][]): Promise<void> {
  const client = getClient();
  await ensureSheet(name);
  const values = [headers, ...data];
  await client.values.clear({
    spreadsheetId: sheetId(),
    range: `${name}!A:Z`,
  });
  await client.values.update({
    spreadsheetId: sheetId(),
    range: `${name}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function appendRows(name: string, values: string[][]): Promise<void> {
  const client = getClient();
  await ensureSheet(name);
  await client.values.append({
    spreadsheetId: sheetId(),
    range: `${name}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

export async function getRoutes(): Promise<BusRoute[]> {
  return readSheet('Routes', (row) => ({
    id: row[0] || '',
    name: row[1] || '',
    stops: row[2] ? JSON.parse(row[2]) : [],
    studentIds: row[3] ? JSON.parse(row[3]) : [],
  }));
}

export async function saveRoutes(routes: BusRoute[]): Promise<void> {
  const headers = ['id', 'name', 'stops', 'studentIds'];
  const data = routes.map((r) => [
    r.id,
    r.name,
    JSON.stringify(r.stops),
    JSON.stringify(r.studentIds),
  ]);
  await writeSheet('Routes', headers, data);
}

export async function getStudents(): Promise<Student[]> {
  return readSheet('Students', (row) => ({
    id: row[0] || '',
    name: row[1] || '',
    rfidTag: row[2] || '',
    routeIds: row[3] ? JSON.parse(row[3]) : [],
  }));
}

export async function saveStudents(students: Student[]): Promise<void> {
  const headers = ['id', 'name', 'rfidTag', 'routeIds'];
  const data = students.map((s) => [
    s.id,
    s.name,
    s.rfidTag,
    JSON.stringify(s.routeIds),
  ]);
  await writeSheet('Students', headers, data);
}

export async function getRouteHistories(): Promise<RouteHistory[]> {
  return readSheet('RouteHistory', (row) => ({
    id: row[0] || '',
    routeId: row[1] || '',
    startTime: row[2] || '',
    endTime: row[3] || null,
    attendanceStr: row[4] || '0/0',
    stopsProgress: row[5] ? JSON.parse(row[5]) : [],
    status: (row[6] || 'end') as RouteHistory['status'],
  }));
}

export async function saveRouteHistories(histories: RouteHistory[]): Promise<void> {
  const headers = ['id', 'routeId', 'startTime', 'endTime', 'attendanceStr', 'stopsProgress', 'status'];
  const data = histories.map((h) => [
    h.id,
    h.routeId,
    h.startTime,
    h.endTime || '',
    h.attendanceStr,
    JSON.stringify(h.stopsProgress),
    h.status,
  ]);
  await writeSheet('RouteHistory', headers, data);
}

export async function appendRouteHistory(rh: RouteHistory): Promise<void> {
  await appendRows('RouteHistory', [[
    rh.id,
    rh.routeId,
    rh.startTime,
    rh.endTime || '',
    rh.attendanceStr,
    JSON.stringify(rh.stopsProgress),
    rh.status,
  ]]);
}

export async function getAttendanceLog(): Promise<Array<{ routeHistoryId: string; studentId: string; studentName: string; isPresent: string; timestamp: string }>> {
  return readSheet('Attendance', (row) => ({
    routeHistoryId: row[0] || '',
    studentId: row[1] || '',
    studentName: row[2] || '',
    isPresent: row[3] || 'false',
    timestamp: row[4] || '',
  }));
}

export async function appendAttendanceLog(records: Array<{ routeHistoryId: string; studentId: string; studentName: string; isPresent: string; timestamp: string }>): Promise<void> {
  const values = records.map((r) => [r.routeHistoryId, r.studentId, r.studentName, r.isPresent, r.timestamp]);
  await appendRows('Attendance', values);
}

export async function initSheets(): Promise<void> {
  await ensureSheet('Routes');
  await ensureSheet('Students');
  await ensureSheet('Attendance');
  await ensureSheet('RouteHistory');

  const client = getClient();
  const sheetDefaults: Record<string, string[]> = {
    Routes: ['id', 'name', 'stops', 'studentIds'],
    Students: ['id', 'name', 'rfidTag', 'routeIds'],
    Attendance: ['routeHistoryId', 'studentId', 'studentName', 'isPresent', 'timestamp'],
    RouteHistory: ['id', 'routeId', 'startTime', 'endTime', 'attendanceStr', 'stopsProgress', 'status'],
  };

  for (const [sheet, headers] of Object.entries(sheetDefaults)) {
    const res = await client.values.get({
      spreadsheetId: sheetId(),
      range: `${sheet}!A:Z`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await client.values.update({
        spreadsheetId: sheetId(),
        range: `${sheet}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }
}
