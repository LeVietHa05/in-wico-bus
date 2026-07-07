import { NextRequest, NextResponse } from 'next/server';
import { getStudents, saveStudents, getRoutes, saveRoutes } from '@/lib/google-sheets';
import { Student, BusRoute } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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

export async function GET() {
  try {
    const students = await getStudents();
    return NextResponse.json({ data: students });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rfidTag, routeIds, parentName, parentEmail } = body;

    if (!name || !rfidTag) {
      return NextResponse.json({ error: 'Name and RFID tag are required' }, { status: 400 });
    }

    const students = await getStudents();
    const existing = students.find((s) => s.rfidTag === rfidTag);
    if (existing) {
      return NextResponse.json({ error: 'RFID tag already registered' }, { status: 409 });
    }

    const newStudent: Student = {
      id: uuidv4(),
      name,
      rfidTag,
      routeIds: routeIds || [],
      parentName: parentName || '',
      parentEmail: parentEmail || '',
    };

    students.push(newStudent);
    await saveStudents(students);

    if (newStudent.routeIds.length > 0) {
      const routes = await getRoutes();
      await syncStudentToRoutes(newStudent.id, newStudent.routeIds, routes);
    }

    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
