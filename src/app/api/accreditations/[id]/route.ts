import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { parsePhaseStart, parsePhaseEnd } from '@/lib/date';
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
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const accreditation = await prisma.accreditation.findUnique({
    where: { id },
    include: {
      project: true,
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } },
      history: {
        include: {
          performedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { performedAt: 'desc' },
      },
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

  return NextResponse.json({ data: transformAccreditation(accreditation), accreditation: transformAccreditation(accreditation) });
}, { requireAuth: true });

// PATCH /api/accreditations/[id] - Update accreditation
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  // Fetch current record for change tracking
  const existing = await prisma.accreditation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  const body = await request.json();

  // Check if this is a status update or a full update
  const isStatusUpdate = 'status' in body && Object.keys(body).length <= 2;

  let updateData: Record<string, unknown>;
  if (isStatusUpdate) {
    const statusResult = updateStatusSchema.safeParse(body);
    if (!statusResult.success) {
      return NextResponse.json({ error: statusResult.error.issues[0].message }, { status: 400 });
    }
    updateData = statusResult.data;
    // Only admin/manager can change status
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const updateResult = updateAccreditationSchema.safeParse(body);
    if (!updateResult.success) {
      return NextResponse.json({ error: updateResult.error.issues[0].message }, { status: 400 });
    }
    const data = updateResult.data;
    // Convert phases array to string if present
    if (data.phases) {
      const { phases, ...rest } = data;
      updateData = { ...rest, phases: phasesToString(phases) };
    } else {
      updateData = data;
    }

    // Convert date strings to Qatar timezone (start=00:00, end=23:59:59 Qatar)
    const dateFields = {
      ...(updateData.bumpInStart !== undefined && { bumpInStart: parsePhaseStart(updateData.bumpInStart as string | null) }),
      ...(updateData.bumpInEnd !== undefined && { bumpInEnd: parsePhaseEnd(updateData.bumpInEnd as string | null) }),
      ...(updateData.liveStart !== undefined && { liveStart: parsePhaseStart(updateData.liveStart as string | null) }),
      ...(updateData.liveEnd !== undefined && { liveEnd: parsePhaseEnd(updateData.liveEnd as string | null) }),
      ...(updateData.bumpOutStart !== undefined && { bumpOutStart: parsePhaseStart(updateData.bumpOutStart as string | null) }),
      ...(updateData.bumpOutEnd !== undefined && { bumpOutEnd: parsePhaseEnd(updateData.bumpOutEnd as string | null) }),
      ...(updateData.qidExpiry !== undefined && { qidExpiry: parsePhaseEnd(updateData.qidExpiry as string | null) }),
      ...(updateData.passportExpiry !== undefined && { passportExpiry: parsePhaseEnd(updateData.passportExpiry as string | null) }),
      ...(updateData.hayyaExpiry !== undefined && { hayyaExpiry: parsePhaseEnd(updateData.hayyaExpiry as string | null) }),
    };
    updateData = { ...updateData, ...dateFields };
  }

  const accreditation = await prisma.accreditation.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Build change summary for audit trail
  const changedFields: string[] = [];
  for (const key of Object.keys(updateData)) {
    const oldVal = existing[key as keyof typeof existing];
    const newVal = updateData[key];
    // Normalize: treat null and undefined as equal
    const normOld = oldVal ?? null;
    const normNew = newVal ?? null;
    if (normOld === null && normNew === null) continue;
    if (normOld instanceof Date || normNew instanceof Date) {
      // Compare timestamps to avoid timezone/ms drift
      const oldMs = normOld instanceof Date ? normOld.getTime() : null;
      const newMs = normNew instanceof Date ? (normNew as Date).getTime() : null;
      if (oldMs !== newMs) changedFields.push(key);
    } else if (normOld !== normNew) {
      changedFields.push(key);
    }
  }

  if (changedFields.length > 0) {
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: id,
        action: isStatusUpdate ? 'STATUS_CHANGE' : 'UPDATED',
        oldStatus: existing.status,
        newStatus: accreditation.status,
        notes: `Changed: ${changedFields.join(', ')}`,
        performedById: session.user.id,
      },
    });
  }

  return NextResponse.json({ data: transformAccreditation(accreditation), accreditation: transformAccreditation(accreditation) });
}, { requireAuth: true });

// DELETE /api/accreditations/[id] - Delete accreditation
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await prisma.accreditation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}, { requireAuth: true });
