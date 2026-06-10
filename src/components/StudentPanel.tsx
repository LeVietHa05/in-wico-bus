'use client';

import { useState } from 'react';
import { Student, BusRoute, Attendance, RouteHistory } from '@/lib/types';

interface StudentPanelProps {
  route: BusRoute | null;
  students: Student[];
  attendance: Attendance[];
  currentRouteHistory: RouteHistory | null;
}

export default function StudentPanel({ route, students, attendance, currentRouteHistory }: StudentPanelProps) {
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  const routeStudents = route
    ? students.filter((s) => route.studentIds.includes(s.id))
    : [];

  const enrichedStudents = routeStudents.map((s) => {
    const att = attendance.find((a) => a.studentId === s.id);
    return { ...s, isPresent: att?.isPresent || false };
  });

  const presentCount = enrichedStudents.filter((s) => s.isPresent).length;
  const absentCount = enrichedStudents.filter((s) => !s.isPresent).length;

  const filteredStudents = enrichedStudents.filter((s) => {
    if (filter === 'present') return s.isPresent;
    if (filter === 'absent') return !s.isPresent;
    return true;
  });

  const isActive = currentRouteHistory !== null;

  return (
    <div className="h-full flex flex-col bg-white border-l border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Students</h2>
        {route && (
          <p className="text-xs text-gray-400 mt-0.5">{route.name}</p>
        )}
      </div>

      {!route ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-400 text-center">
            Select a route to view students
          </p>
        </div>
      ) : (
        <>
          {isActive && (
            <div className="px-4 py-2 bg-gray-50 border-b border-[var(--border)]">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-700 font-medium">
                  {presentCount} Present
                </span>
                <span className="text-red-700 font-medium">
                  {absentCount} Absent
                </span>
                <span className="text-gray-500">
                  {enrichedStudents.length} Total
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {(['all', 'present', 'absent'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                      filter === f
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 && (
              <div className="p-4 text-sm text-gray-400 text-center">
                {isActive ? 'No students match filter' : 'No students assigned'}
              </div>
            )}
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {student.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {student.rfidTag}
                  </p>
                </div>
                {isActive && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    student.isPresent
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {student.isPresent ? 'Present' : 'Absent'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
