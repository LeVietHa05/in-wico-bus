import { NextRequest, NextResponse } from 'next/server';
import { getStudents, saveStudents, getRoutes, saveRoutes } from '@/lib/google-sheets';
import { BusRoute } from '@/lib/types';

async function syncStudentToRoutes(studentId: string, routeIds: string[], allRoutes: BusRoute[]): Promise<void> {
  for (const route of allRoutes) {
    const hadStudent = route.studentIds.includes(studentId);
    const shouldHave = routeIds.includes(route.id);
    if (hadStudent && !shouldHave) {
      route.studentIds = route.studentIds.filter((id) => id !== studentId);
    } else if (!hadStudent && shouldHave) {
      route.studentIds.push(studentId);
    }
  }
  await saveRoutes(allRoutes);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const students = await getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ data: student });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const students = await getStudents();
    const idx = students.findIndex((s) => s.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const oldRouteIds = students[idx].routeIds;
    students[idx] = { ...students[idx], ...body, id };
    await saveStudents(students);

    const newRouteIds = students[idx].routeIds;
    if (JSON.stringify(oldRouteIds) !== JSON.stringify(newRouteIds)) {
      const routes = await getRoutes();
      await syncStudentToRoutes(id, newRouteIds, routes);
    }

    return NextResponse.json({ data: students[idx] });
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
    const students = await getStudents();
    const student = students.find((s) => s.id === id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const filtered = students.filter((s) => s.id !== id);
    await saveStudents(filtered);

    if (student.routeIds.length > 0) {
      const routes = await getRoutes();
      for (const route of routes) {
        route.studentIds = route.studentIds.filter((sid) => sid !== id);
      }
      await saveRoutes(routes);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
