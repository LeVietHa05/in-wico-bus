'use client';

import { BusRoute, GPSData, RouteHistory, RoutePath } from '@/lib/types';

interface RoutePanelProps {
  routes: BusRoute[];
  currentRouteHistory: RouteHistory | null;
  currentGPS: GPSData | null;
  onSelectRoute: (route: BusRoute) => void;
  onStartRoute: (routeId: string) => void;
  onStopRoute: () => void;
  isLoading: boolean;
  routePath?: RoutePath | null;
}

export default function RoutePanel({
  routes,
  currentRouteHistory,
  currentGPS,
  onSelectRoute,
  onStartRoute,
  onStopRoute,
  isLoading,
  routePath,
}: RoutePanelProps) {
  const activeRoute = currentRouteHistory
    ? routes.find((r) => r.id === currentRouteHistory.routeId)
    : null;

  const visitedStops = currentRouteHistory?.stopsProgress?.filter((s) => s.arrivalTime !== null) || [];

  return (
    <div className="h-full flex flex-col bg-white border-r border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Routes & Stops</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {routes.length === 0 && !isLoading && (
          <div className="p-4 text-sm text-gray-400 text-center">No routes created yet</div>
        )}

        {isLoading && (
          <div className="p-4 text-sm text-gray-400 text-center">Loading...</div>
        )}

        {currentRouteHistory && activeRoute && (
          <div className="bg-green-50 border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-green-800">Active Trip</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                currentRouteHistory.status === 'end'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {currentRouteHistory.status}
              </span>
            </div>
            <p className="text-xs text-green-700 font-medium mb-2">{activeRoute.name}</p>
            <p className="text-xs text-gray-500 mb-1">
              Attendance: {currentRouteHistory.attendanceStr}
            </p>
            {routePath && routePath.totalDistance > 0 && (
              <p className="text-xs text-gray-500 mb-1">
                Total: ~{Math.round(routePath.totalDuration / 60)} min ({(routePath.totalDistance / 1000).toFixed(1)} km)
              </p>
            )}
            {currentRouteHistory.startTime && (
              <p className="text-xs text-gray-400 mb-1">
                Started: {new Date(currentRouteHistory.startTime).toLocaleTimeString()}
              </p>
            )}
            {currentRouteHistory.endTime && (
              <p className="text-xs text-gray-400 mb-1">
                Ended: {new Date(currentRouteHistory.endTime).toLocaleTimeString()}
              </p>
            )}
            <div className="space-y-1 mt-2">
              {currentRouteHistory.stopsProgress.map((sp, i) => {
                const arrived = sp.arrivalTime !== null;
                const seg = i > 0 ? routePath?.segments?.[i - 1] : null;
                return (
                  <div key={sp.stopId} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${arrived ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={arrived ? 'text-green-700' : 'text-gray-500'}>
                      {i + 1}. {sp.name}
                    </span>
                    {arrived ? (
                      <span className="text-gray-400 ml-auto">
                        {new Date(sp.arrivalTime!).toLocaleTimeString()}
                      </span>
                    ) : seg && seg.duration > 0 && (
                      <span className="text-gray-400 ml-auto">
                        ~{Math.round(seg.duration / 60)} min
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {currentRouteHistory.status === 'running' && (
              <button
                onClick={onStopRoute}
                className="mt-3 w-full px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Stop Navigation
              </button>
            )}
          </div>
        )}

        {routes.map((route) => {
          const isActive = activeRoute?.id === route.id;
          if (isActive) return null;

          return (
            <div
              key={route.id}
              className="border-b border-[var(--border)] cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSelectRoute(route)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm text-gray-900">
                    {route.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''} &middot; {route.studentIds.length} student{route.studentIds.length !== 1 ? 's' : ''}
                </p>
                {route.stops.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {route.stops.map((stop, i) => (
                      <div key={stop.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{stop.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 pb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onStartRoute(route.id); }}
                  className="w-full px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  Start Navigation
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {currentGPS && activeRoute && (
        <div className="p-4 border-t border-[var(--border)] bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Bus Location</p>
          <p className="text-xs font-mono text-gray-700">
            {currentGPS.lat.toFixed(6)}, {currentGPS.lng.toFixed(6)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Updated: {new Date(currentGPS.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}
