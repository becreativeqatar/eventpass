import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import {
  updateAccreditationSchema,
  updateStatusSchema,
  phasesToString,
  stringToPhases,
} from '@/lib/validations/accreditation';

// Helper to transform accreditation for response
function transformAccreditation(acc: { phases: string; [key: string]: unknown }) {
  return {
    ...acc,
    phases: stringToPhases(acc.phases),
  };
}

// GET /api/accreditations/[id] - Get single accreditation
export const GET = withErrorHandler(async (
  request: NextRequest,
  context: { params?: { id?: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = context?.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const accreditation = await prisma.accreditation.findUnique({
    where: { id },
    include: {
      project: true,
      createdBy: { select: { id: true, name: true, email: true } },
      scans: {
        include: {
          scannedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scannedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!accreditation) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  return NextResponse.json({ data: transformAccreditation(accreditation) });
}, { requireAuth: true });

// PATCH /api/accreditations/[id] - Update accreditation
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context: { params?: { id?: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = context?.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const body = await request.json();

  // Check if this is a status update or a full update
  const isStatusUpdate = 'status' in body && Object.keys(body).length <= 2;

  let updateData: Record<string, unknown>;
  if (isStatusUpdate) {
    updateData = updateStatusSchema.parse(body);
    // Only admin/manager can change status
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const data = updateAccreditationSchema.parse(body);
    // Convert phases array to string if present
    if (data.phases) {
      const { phases, ...rest } = data;
      updateData = { ...rest, phases: phasesToString(phases) };
    } else {
      updateData = data;
    }
  }

  const accreditation = await prisma.accreditation.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: transformAccreditation(accreditation) });
}, { requireAuth: true });

// DELETE /api/accreditations/[id] - Delete accreditation
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context: { params?: { id?: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = context?.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await prisma.accreditation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}, { requireAuth: true });
