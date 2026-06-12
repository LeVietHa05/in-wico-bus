'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { BusRoute, Student } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const StopPickerMap = dynamic(() => import('@/components/StopPickerMap'), { ssr: false });

interface LogEntry {
  id: string;
  time: string;
  type: 'GPS' | 'RFID' | 'Lookup';
  summary: string;
  response: string;
}

export default function SimulatePage() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [hasActiveNav, setHasActiveNav] = useState(false);

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [routeHistoryId, setRouteHistoryId] = useState('');
  const [navStarting, setNavStarting] = useState(false);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [gpsResponse, setGpsResponse] = useState('');
  const [sendingGps, setSendingGps] = useState(false);

  const [rfidTag, setRfidTag] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [rfidResponse, setRfidResponse] = useState('');
  const [sendingRfid, setSendingRfid] = useState(false);

  const [log, setLog] = useState<LogEntry[]>([]);

  const fetchNavState = useCallback(async () => {
    try {
      const navRes = await fetch('/api/navigation');
      const navJson = await navRes.json();
      const rh = navJson.data?.routeHistory;
      if (rh) {
        setRouteHistoryId(rh.id);
        setSelectedRouteId((prev) => prev || rh.routeId);
        setHasActiveNav(true);
      } else {
        setRouteHistoryId('');
        setHasActiveNav(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [routesRes, studentsRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/students'),
      ]);
      const routesJson = await routesRes.json();
      const studentsJson = await studentsRes.json();
      setRoutes(routesJson.data || []);
      setStudents(studentsJson.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNavState();
  }, [fetchData, fetchNavState]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const addLog = (entry: Omit<LogEntry, 'id' | 'time'>) => {
    setLog((prev) => [{ id: uuidv4(), time: new Date().toLocaleTimeString(), ...entry }, ...prev]);
  };

  const handleMapPick = (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat.toFixed(6));
    setLng(pickedLng.toFixed(6));
  };

  const handleStartNav = async () => {
    if (!selectedRouteId) return;
    setNavStarting(true);
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', routeId: selectedRouteId }),
      });
      if (res.ok) {
        await fetchNavState();
        addLog({ type: 'Lookup', summary: `Navigation started for ${selectedRoute?.name}`, response: 'OK' });
      } else {
        const err = await res.json();
        addLog({ type: 'Lookup', summary: 'Start nav failed', response: err.error || 'Unknown error' });
      }
    } catch (err: any) {
      addLog({ type: 'Lookup', summary: 'Start nav error', response: err.message });
    } finally {
      setNavStarting(false);
    }
  };

  const handleSendGps = async () => {
    if (!selectedRouteId || !lat || !lng) return;
    setSendingGps(true);
    setGpsResponse('');
    try {
      const res = await fetch('/api/esp32/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRouteId,
          routeHistoryId: routeHistoryId || undefined,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }),
      });
      const data = await res.json();
      const text = JSON.stringify(data, null, 2);
      setGpsResponse(text);
      addLog({
        type: 'GPS',
        summary: `(${lat}, ${lng})${data.stopArrival ? ` \u2192 ${data.stopArrival.stopName}` : ''}`,
        response: text,
      });
    } catch (err: any) {
      const text = `Error: ${err.message}`;
      setGpsResponse(text);
      addLog({ type: 'GPS', summary: `(${lat}, ${lng}) FAILED`, response: text });
    } finally {
      setSendingGps(false);
    }
  };

  const handleFindStudent = () => {
    if (!rfidTag.trim()) return;
    const student = students.find((s) => s.rfidTag === rfidTag.trim()) || null;
    setFoundStudent(student);
    addLog({
      type: 'Lookup',
      summary: `${rfidTag} \u2192 ${student ? student.name : 'not found'}`,
      response: student ? JSON.stringify(student, null, 2) : 'Not found',
    });
  };

  const handleSendRfid = async () => {
    if (!rfidTag.trim() || !routeHistoryId) return;
    setSendingRfid(true);
    setRfidResponse('');
    try {
      const res = await fetch('/api/esp32/rfid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeHistoryId,
          rfidTag: rfidTag.trim(),
        }),
      });
      const data = await res.json();
      const text = JSON.stringify(data, null, 2);
      setRfidResponse(text);
      addLog({
        type: 'RFID',
        summary: `${rfidTag}${data.data?.studentName ? ` \u2192 ${data.data.studentName}` : ''}`,
        response: text,
      });
    } catch (err: any) {
      const text = `Error: ${err.message}`;
      setRfidResponse(text);
      addLog({ type: 'RFID', summary: `${rfidTag} FAILED`, response: text });
    } finally {
      setSendingRfid(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[360px] shrink-0 border-r border-[var(--border)] p-4 overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">GPS Simulator</h2>
          <button onClick={fetchNavState} className="text-xs text-gray-400 hover:text-gray-600">Refresh</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Route</label>
          <select
            value={selectedRouteId}
            onChange={(e) => { setSelectedRouteId(e.target.value); setLat(''); setLng(''); }}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
          >
            <option value="">-- Select Route --</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {!hasActiveNav && selectedRouteId && (
          <button
            onClick={handleStartNav}
            disabled={navStarting}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {navStarting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {navStarting ? 'Starting...' : 'Start Navigation'}
          </button>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Route History ID</label>
          <input
            type="text"
            value={routeHistoryId}
            onChange={(e) => setRouteHistoryId(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm font-mono"
            placeholder={hasActiveNav ? 'Auto-filled from active nav' : 'Start navigation first'}
          />
          {!routeHistoryId && (
            <p className="text-xs text-amber-600 mt-1">Required for stop detection and RFID. Start navigation above or fill manually.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
              placeholder="21.010056"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
              placeholder="105.794806"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {selectedRoute ? 'Click map to set location (blue pins = stops)' : 'Select a route first'}
          </label>
          <div className="rounded-lg overflow-hidden border border-[var(--border)]" style={{ height: 220 }}>
            {selectedRoute && typeof window !== 'undefined' && (
              <StopPickerMap
                stops={selectedRoute.stops}
                onPick={handleMapPick}
              />
            )}
          </div>
        </div>

        <button
          onClick={handleSendGps}
          disabled={sendingGps || !selectedRouteId || !lat || !lng}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {sendingGps && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {sendingGps ? 'Sending...' : 'Send GPS'}
        </button>

        {gpsResponse && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Response</label>
            <pre className="text-xs bg-gray-50 border border-[var(--border)] rounded-md p-2 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">{gpsResponse}</pre>
          </div>
        )}
      </div>

      <div className="w-[360px] shrink-0 border-r border-[var(--border)] p-4 overflow-y-auto flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">RFID Simulator</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Route History ID <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={routeHistoryId}
            onChange={(e) => setRouteHistoryId(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm font-mono"
            placeholder="Same as GPS panel"
          />
          {!routeHistoryId && (
            <p className="text-xs text-red-600 mt-1">Required. Start navigation in GPS panel or fill manually.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">RFID Tag</label>
          <input
            type="text"
            value={rfidTag}
            onChange={(e) => { setRfidTag(e.target.value); setFoundStudent(null); }}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm font-mono"
            placeholder="e.g. A1:B2:C3:D4"
          />
        </div>

        <button
          onClick={handleFindStudent}
          disabled={!rfidTag.trim()}
          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Find Student
        </button>

        {foundStudent !== null && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
            <p className="font-medium text-green-800">{foundStudent.name}</p>
            <p className="text-xs text-green-600 mt-0.5">RFID: {foundStudent.rfidTag}</p>
            <p className="text-xs text-green-600">Routes: {foundStudent.routeIds.length} assigned</p>
          </div>
        )}

        {foundStudent === null && rfidTag.trim().length > 0 && (
          <p className="text-xs text-red-600">No student found with this RFID tag</p>
        )}

        <button
          onClick={handleSendRfid}
          disabled={sendingRfid || !rfidTag.trim() || !routeHistoryId}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {sendingRfid && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {sendingRfid ? 'Sending...' : 'Send RFID'}
        </button>

        {rfidResponse && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Response</label>
            <pre className="text-xs bg-gray-50 border border-[var(--border)] rounded-md p-2 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">{rfidResponse}</pre>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Send Log</h2>
          {log.length > 0 && (
            <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No sends yet. Use GPS or RFID panels above.</p>
        ) : (
          log.map((entry) => (
            <div key={entry.id} className="border border-[var(--border)] rounded-md p-2 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-400">{entry.time}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  entry.type === 'GPS' ? 'bg-blue-100 text-blue-700' :
                  entry.type === 'RFID' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{entry.type}</span>
              </div>
              <p className="text-gray-700 mb-1">{entry.summary}</p>
              <details>
                <summary className="text-gray-400 cursor-pointer hover:text-gray-600 text-[11px]">Response</summary>
                <pre className="mt-1 bg-gray-50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">{entry.response}</pre>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
