import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceLog } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routeHistoryId = searchParams.get('routeHistoryId');
    const data = await getAttendanceLog();
    const filtered = routeHistoryId
      ? data.filter((r) => r.routeHistoryId === routeHistoryId)
      : data;
    return NextResponse.json({ data: filtered });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch attendance log' }, { status: 500 });
  }
}
