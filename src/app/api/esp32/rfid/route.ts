import { NextRequest, NextResponse } from 'next/server';
import { addAttendance, getRouteHistory, updateRouteHistory, getAttendance } from '@/lib/store';
import { getStudents } from '@/lib/google-sheets';
import { appendAttendanceLog } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routeHistoryId, rfidTag } = body;

    if (!routeHistoryId || !rfidTag) {
      return NextResponse.json({ error: 'Missing required fields: routeHistoryId, rfidTag' }, { status: 400 });
    }

    const rh = getRouteHistory(routeHistoryId);
    if (!rh) {
      return NextResponse.json({ error: 'Route history not found. Is navigation active?' }, { status: 404 });
    }

    const students = await getStudents();
    const student = students.find((s) => s.rfidTag === rfidTag);

    if (!student) {
      return NextResponse.json({ error: 'Unknown RFID tag' }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const record = {
      studentId: student.id,
      routeHistoryId,
      studentName: student.name,
      isPresent: true,
      timestamp,
    };

    addAttendance(record);

    const attendance = getAttendance(routeHistoryId);
    const total = rh.attendanceStr.split('/')[1] || '0';
    const present = attendance.filter((a) => a.isPresent).length;
    updateRouteHistory(routeHistoryId, { attendanceStr: `${present}/${total}` });

    try {
      await appendAttendanceLog([{
        routeHistoryId,
        studentId: student.id,
        studentName: student.name,
        isPresent: 'true',
        timestamp,
      }]);
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true, data: record });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
