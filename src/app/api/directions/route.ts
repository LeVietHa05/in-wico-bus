import { NextRequest, NextResponse } from 'next/server';
import { fetchORSDrivePath } from '@/lib/openroute';
import { getCachedRoutePath, setCachedRoutePath } from '@/lib/store';
import { Stop } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routeId, stops } = body as { routeId: string; stops: Stop[] };

    if (!routeId || !stops || !Array.isArray(stops)) {
      return NextResponse.json({ error: 'routeId and stops array are required' }, { status: 400 });
    }

    const cached = getCachedRoutePath(routeId);
    if (cached) {
      return NextResponse.json({ data: cached });
    }

    if (stops.length < 2) {
      const empty = { segments: [], totalDistance: 0, totalDuration: 0, geometry: [] as [number, number][] };
      setCachedRoutePath(routeId, empty);
      return NextResponse.json({ data: empty });
    }

    const routePath = await fetchORSDrivePath(stops);
    setCachedRoutePath(routeId, routePath);

    return NextResponse.json({ data: routePath });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch directions' },
      { status: 500 }
    );
  }
}
