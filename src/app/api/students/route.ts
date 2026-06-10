import { NextRequest, NextResponse } from 'next/server';
import { getStudents, saveStudents } from '@/lib/google-sheets';
import { Student } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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
    const { name, rfidTag, routeIds } = body;

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
    };

    students.push(newStudent);
    await saveStudents(students);

    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
