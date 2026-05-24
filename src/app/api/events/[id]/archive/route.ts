import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/events/[id]/archive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.accreditationProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (existing.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Cannot archive an event with status ${existing.status}. Complete it first.` }, { status: 400 });
    }

    const event = await prisma.accreditationProject.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('Error archiving event:', error);
    return NextResponse.json({ error: 'Failed to archive event' }, { status: 500 });
  }
}
