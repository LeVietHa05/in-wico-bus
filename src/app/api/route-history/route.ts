import { NextResponse } from 'next/server';
import { getRouteHistories } from '@/lib/google-sheets';
import { getAllRouteHistories } from '@/lib/store';

export async function GET() {
  try {
    const inMemory = getAllRouteHistories();
    let persisted: Array<any> = [];
    try {
      persisted = await getRouteHistories();
    } catch {
      // best-effort
    }

    const merged = [...inMemory];
    for (const p of persisted) {
      if (!merged.find((m) => m.id === p.id)) {
        merged.push(p);
      }
    }

    return NextResponse.json({ data: merged });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch route histories' }, { status: 500 });
  }
}
