import { NextRequest, NextResponse } from 'next/server';
import { getRoutes, saveRoutes } from '@/lib/google-sheets';
import { BusRoute } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const routes = await getRoutes();
    return NextResponse.json({ data: routes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch routes', e: error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, stops, studentIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Route name is required' }, { status: 400 });
    }

    const routes = await getRoutes();
    const newRoute: BusRoute = {
      id: uuidv4(),
      name,
      stops: stops || [],
      studentIds: studentIds || [],
    };

    routes.push(newRoute);
    await saveRoutes(routes);

    return NextResponse.json({ data: newRoute }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
