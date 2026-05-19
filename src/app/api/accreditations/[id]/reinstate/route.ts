import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { AccreditationStatus } from '@/lib/validations/accreditation';

// PATCH /api/accreditations/[id]/reinstate - Reinstate a revoked/rejected accreditation
export const PATCH = withErrorHandler(async (
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

  const body = await request.json().catch(() => ({}));

  const existing = await prisma.accreditation.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  if (existing.status !== AccreditationStatus.REVOKED && existing.status !== AccreditationStatus.REJECTED) {
    return NextResponse.json(
      { error: `Cannot reinstate accreditation with status ${existing.status}` },
      { status: 400 }
    );
  }

  const oldStatus = existing.status;
  const accreditation = await prisma.accreditation.update({
    where: { id },
    data: {
      status: AccreditationStatus.APPROVED,
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  await prisma.accreditationHistory.create({
    data: {
      accreditationId: id,
      action: 'REINSTATED',
      oldStatus,
      newStatus: AccreditationStatus.APPROVED,
      notes: body.notes,
      performedById: session.user.id,
    },
  });

  return NextResponse.json({
    data: accreditation,
    message: 'Accreditation reinstated',
  });
}, { requireAuth: true });
