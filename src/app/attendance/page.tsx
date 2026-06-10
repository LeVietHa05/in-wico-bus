'use client';

import { useState, useEffect, useCallback } from 'react';
import { RouteHistory, BusRoute } from '@/lib/types';

interface AttendanceRecord {
  routeHistoryId: string;
  studentId: string;
  studentName: string;
  isPresent: string;
  timestamp: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [routeHistories, setRouteHistories] = useState<RouteHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [tripFilter, setTripFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const [routesRes, attRes, rhRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/attendance'),
        fetch('/api/route-history'),
      ]);
      const routesJson = await routesRes.json();
      const routesData = routesJson.data || [];
      setRoutes(routesData);

      const rhJson = await rhRes.json();
      const rhData = rhJson.data || [];
      setRouteHistories(rhData);

      const attJson = await attRes.json();
      setRecords(attJson.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredByRoute = routeFilter === 'all'
    ? records
    : records.filter((r) => {
        const rh = routeHistories.find((h) => h.id === r.routeHistoryId);
        return rh?.routeId === routeFilter;
      });

  const filteredRecords = tripFilter === 'all'
    ? filteredByRoute
    : filteredByRoute.filter((r) => r.routeHistoryId === tripFilter);

  const tripsForSelectedRoute = routeHistories.filter((rh) =>
    routeFilter === 'all' ? true : rh.routeId === routeFilter
  );

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance History</h1>
          <p className="text-sm text-gray-500">Track student attendance across routes and trips</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={routeFilter}
          onChange={(e) => { setRouteFilter(e.target.value); setTripFilter('all'); }}
          className="px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="all">All Routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={tripFilter}
          onChange={(e) => setTripFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="all">All Trips</option>
          {tripsForSelectedRoute.map((rh) => {
            const route = routes.find((r) => r.id === rh.routeId);
            return (
              <option key={rh.id} value={rh.id}>
                {route?.name || 'Unknown'} — {new Date(rh.startTime).toLocaleDateString()} {new Date(rh.startTime).toLocaleTimeString()}
              </option>
            );
          })}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-lg border border-[var(--border)]">
          No attendance records found
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Route</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredRecords.map((rec, i) => {
                const rh = routeHistories.find((h) => h.id === rec.routeHistoryId);
                const route = rh ? routes.find((r) => r.id === rh.routeId) : null;
                return (
                  <tr key={`${rec.studentId}-${rec.timestamp}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.studentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{route?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rec.isPresent === 'true'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {rec.isPresent === 'true' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(rec.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
