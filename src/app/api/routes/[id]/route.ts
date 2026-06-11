import { NextRequest, NextResponse } from 'next/server';
import { getRoutes, saveRoutes } from '@/lib/google-sheets';
import { invalidateRoutePathCache } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const routes = await getRoutes();
    const route = routes.find((r) => r.id === id);
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    return NextResponse.json({ data: route });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const routes = await getRoutes();
    const idx = routes.findIndex((r) => r.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    routes[idx] = { ...routes[idx], ...body, id };
    await saveRoutes(routes);
    invalidateRoutePathCache(id);

    return NextResponse.json({ data: routes[idx] });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const routes = await getRoutes();
    const filtered = routes.filter((r) => r.id !== id);
    if (filtered.length === routes.length) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    await saveRoutes(filtered);
    invalidateRoutePathCache(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
  }
}
