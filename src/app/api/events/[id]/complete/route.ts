import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/events/[id]/complete
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

    const event = await prisma.accreditationProject.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('Error completing event:', error);
    return NextResponse.json({ error: 'Failed to complete event' }, { status: 500 });
  }
}
