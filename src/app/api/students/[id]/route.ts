import { NextRequest, NextResponse } from 'next/server';
import { getStudents, saveStudents } from '@/lib/google-sheets';

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

    students[idx] = { ...students[idx], ...body, id };
    await saveStudents(students);

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
    const filtered = students.filter((s) => s.id !== id);
    if (filtered.length === students.length) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    await saveStudents(filtered);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
