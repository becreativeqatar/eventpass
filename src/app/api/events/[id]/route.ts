import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePhaseStart, parsePhaseEnd, parseEventDate } from '@/lib/date';

// Lookup event by id or code (case-insensitive for code)
async function findEvent(idOrCode: string) {
  const event = await prisma.accreditationProject.findFirst({
    where: {
      OR: [
        { id: idOrCode },
        { code: { equals: idOrCode, mode: 'insensitive' } },
      ],
    },
    include: {
      _count: { select: { accreditations: true } },
    },
  });
  return event;
}

// GET /api/events/[id] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await findEvent(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PATCH /api/events/[id] - Update event details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await findEvent(id);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, code, status, description, venue, eventDate, bumpInStart, bumpInEnd, liveStart, liveEnd, bumpOutStart, bumpOutEnd, accessGroups } = body;

    const accessGroupsStr = Array.isArray(accessGroups) ? accessGroups.join(',') : undefined;

    // Check for duplicate code if changing it
    if (code && code !== existing.code) {
      const codeExists = await prisma.accreditationProject.findFirst({
        where: { code, id: { not: existing.id } },
      });
      if (codeExists) {
        return NextResponse.json({ error: 'Event code already exists' }, { status: 400 });
      }
    }

    const event = await prisma.accreditationProject.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code || null }),
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description: description || null }),
        ...(venue !== undefined && { venue: venue || null }),
        ...(eventDate !== undefined && { eventDate: parseEventDate(eventDate) }),
        ...(bumpInStart !== undefined && { bumpInStart: parsePhaseStart(bumpInStart) }),
        ...(bumpInEnd !== undefined && { bumpInEnd: parsePhaseEnd(bumpInEnd) }),
        ...(liveStart !== undefined && { liveStart: parsePhaseStart(liveStart) }),
        ...(liveEnd !== undefined && { liveEnd: parsePhaseEnd(liveEnd) }),
        ...(bumpOutStart !== undefined && { bumpOutStart: parsePhaseStart(bumpOutStart) }),
        ...(bumpOutEnd !== undefined && { bumpOutEnd: parsePhaseEnd(bumpOutEnd) }),
        ...(accessGroupsStr !== undefined && { accessGroups: accessGroupsStr }),
      },
    });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/events/[id] - Delete a draft event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const found = await findEvent(id);
    if (!found) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const existing = await prisma.accreditationProject.findUnique({
      where: { id: found.id },
      include: { _count: { select: { accreditations: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft events can be deleted' },
        { status: 400 }
      );
    }

    if (existing._count.accreditations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with existing accreditation records' },
        { status: 409 }
      );
    }

    await prisma.accreditationProject.delete({ where: { id: found.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
