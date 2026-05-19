import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const existing = await prisma.accreditationProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, venue, eventDate, bumpInStart, bumpInEnd, liveStart, liveEnd, bumpOutStart, bumpOutEnd, accessGroups } = body;

    const accessGroupsStr = Array.isArray(accessGroups) ? accessGroups.join(',') : undefined;

    const event = await prisma.accreditationProject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(venue !== undefined && { venue: venue || null }),
        ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
        ...(bumpInStart !== undefined && { bumpInStart: bumpInStart ? new Date(bumpInStart) : null }),
        ...(bumpInEnd !== undefined && { bumpInEnd: bumpInEnd ? new Date(bumpInEnd) : null }),
        ...(liveStart !== undefined && { liveStart: liveStart ? new Date(liveStart) : null }),
        ...(liveEnd !== undefined && { liveEnd: liveEnd ? new Date(liveEnd) : null }),
        ...(bumpOutStart !== undefined && { bumpOutStart: bumpOutStart ? new Date(bumpOutStart) : null }),
        ...(bumpOutEnd !== undefined && { bumpOutEnd: bumpOutEnd ? new Date(bumpOutEnd) : null }),
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

    const existing = await prisma.accreditationProject.findUnique({
      where: { id },
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

    await prisma.accreditationProject.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
