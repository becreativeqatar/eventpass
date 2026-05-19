import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { AccreditationStatus } from '@/lib/validations/accreditation';

// PATCH /api/accreditations/[id]/return-to-draft - Return a pending/rejected accreditation to draft
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

  const body = await request.json().catch(() => ({}));

  const existing = await prisma.accreditation.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  // Only allow returning to draft from PENDING or REJECTED status
  const allowedStatuses = ['PENDING', 'REJECTED'];
  if (!allowedStatuses.includes(existing.status)) {
    return NextResponse.json(
      { error: `Cannot return to draft from status ${existing.status}. Only PENDING or REJECTED can be returned to draft.` },
      { status: 400 }
    );
  }

  // Only the creator, approvers, or admins can return to draft
  if (
    existing.createdById !== session.user.id &&
    !['ADMIN', 'MANAGER'].includes(session.user.role)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accreditation = await prisma.accreditation.update({
    where: { id },
    data: {
      status: AccreditationStatus.DRAFT,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  await prisma.accreditationHistory.create({
    data: {
      accreditationId: id,
      action: 'RETURNED_TO_DRAFT',
      oldStatus: existing.status,
      newStatus: AccreditationStatus.DRAFT,
      notes: body.reason || 'Returned to draft for editing',
      performedById: session.user.id,
    },
  });

  return NextResponse.json({
    data: accreditation,
    message: 'Accreditation returned to draft',
  });
}, { requireAuth: true });
