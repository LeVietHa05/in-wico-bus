'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import RoutePanel from '@/components/RoutePanel';
import StudentPanel from '@/components/StudentPanel';
import { BusRoute, Student, GPSData, Attendance, RouteHistory } from '@/lib/types';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function DashboardPage() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [currentRouteHistory, setCurrentRouteHistory] = useState<RouteHistory | null>(null);
  const [currentGPS, setCurrentGPS] = useState<GPSData | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [routesRes, studentsRes, navRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/students'),
        fetch('/api/navigation'),
      ]);

      const routesJson = await routesRes.json();
      const studentsJson = await studentsRes.json();
      const navJson = await navRes.json();

      setRoutes(routesJson.data || []);
      setStudents(studentsJson.data || []);

      const rh = navJson.data?.routeHistory;
      if (rh) {
        setCurrentRouteHistory(rh);
        setCurrentGPS(navJson.data?.currentGPS || null);
        setAttendance(navJson.data?.attendance || []);
        const activeRoute = routesJson.data?.find((r: BusRoute) => r.id === rh.routeId);
        if (activeRoute) setSelectedRoute(activeRoute);
      } else {
        setCurrentRouteHistory(null);
        setCurrentGPS(null);
        setAttendance([]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSelectRoute = useCallback((route: BusRoute) => {
    setSelectedRoute(route);
  }, []);

  const handleStartRoute = useCallback(async (routeId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', routeId }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        console.error('Failed to start:', err.error);
      }
    } catch (err) {
      console.error('Failed to start route:', err);
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const handleStopRoute = useCallback(async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      if (res.ok) {
        setSelectedRoute(null);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to stop route:', err);
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const selectedRouteStudents = selectedRoute
    ? students.filter((s) => selectedRoute.studentIds.includes(s.id))
    : [];

  const visitedStops = currentRouteHistory?.stopsProgress?.filter((s) => s.arrivalTime !== null) || [];
  const totalStops = currentRouteHistory?.stopsProgress?.length || 0;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 shrink-0">
        <RoutePanel
          routes={routes}
          currentRouteHistory={currentRouteHistory}
          currentGPS={currentGPS}
          onSelectRoute={handleSelectRoute}
          onStartRoute={handleStartRoute}
          onStopRoute={handleStopRoute}
          isLoading={isLoading || actionLoading}
        />
      </div>

      <div className="flex-1 relative">
        <Map
          stops={selectedRoute?.stops || []}
          currentLocation={currentGPS ? { lat: currentGPS.lat, lng: currentGPS.lng } : null}
          visitedStopIds={visitedStops.map((s) => s.stopId)}
        />
        {currentRouteHistory && (
          <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {selectedRoute?.name} — {visitedStops.length}/{totalStops} stops
          </div>
        )}
        {!currentRouteHistory && selectedRoute && (
          <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium text-gray-700">
            Route: {selectedRoute.name}
          </div>
        )}
      </div>

      <div className="w-80 shrink-0">
        <StudentPanel
          route={selectedRoute}
          students={selectedRouteStudents}
          attendance={attendance}
          currentRouteHistory={currentRouteHistory}
        />
      </div>
    </div>
  );
}
