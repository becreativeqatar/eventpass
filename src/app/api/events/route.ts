import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCompleteExpiredEvents } from '@/lib/active-project';

// GET /api/events - List all events
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-complete events past their bump-out end date
    await autoCompleteExpiredEvents();

    const events = await prisma.accreditationProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { accreditations: true } },
      },
    });

    const formatted = events.map((e) => ({
      ...e,
      accessGroups: e.accessGroups ? e.accessGroups.split(',').map((g) => g.trim()) : [],
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, venue, eventDate, bumpInStart, bumpInEnd, liveStart, liveEnd, bumpOutStart, bumpOutEnd, accessGroups, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    // Check for duplicate code
    if (code) {
      const existing = await prisma.accreditationProject.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json({ error: 'Event code already exists' }, { status: 400 });
      }
    }

    const accessGroupsStr = Array.isArray(accessGroups) ? accessGroups.join(',') : 'General';
    const targetStatus = status || 'ACTIVE';

    const event = await prisma.accreditationProject.create({
      data: {
        name,
        code: code || name.toUpperCase().replace(/\s+/g, '-').slice(0, 20),
        description: description || null,
        venue: venue || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        bumpInStart: bumpInStart ? new Date(bumpInStart) : null,
        bumpInEnd: bumpInEnd ? new Date(bumpInEnd) : null,
        liveStart: liveStart ? new Date(liveStart) : null,
        liveEnd: liveEnd ? new Date(liveEnd) : null,
        bumpOutStart: bumpOutStart ? new Date(bumpOutStart) : null,
        bumpOutEnd: bumpOutEnd ? new Date(bumpOutEnd) : null,
        accessGroups: accessGroupsStr,
        status: targetStatus,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
