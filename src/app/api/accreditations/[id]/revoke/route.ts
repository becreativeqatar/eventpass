import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { AccreditationStatus } from '@/lib/validations/accreditation';

// PATCH /api/accreditations/[id]/revoke - Revoke an approved accreditation
export const PATCH = withErrorHandler(async (
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

  const body = await request.json().catch(() => ({}));

  const existing = await prisma.accreditation.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  if (existing.status !== AccreditationStatus.APPROVED) {
    return NextResponse.json(
      { error: `Cannot revoke accreditation with status ${existing.status}` },
      { status: 400 }
    );
  }

  const accreditation = await prisma.accreditation.update({
    where: { id },
    data: {
      status: AccreditationStatus.REVOKED,
      revokedById: session.user.id,
      revokedAt: new Date(),
      revokeReason: body.reason || null,
    },
    include: {
      project: { select: { id: true, name: true } },
      revokedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.accreditationHistory.create({
    data: {
      accreditationId: id,
      action: 'REVOKED',
      oldStatus: AccreditationStatus.APPROVED,
      newStatus: AccreditationStatus.REVOKED,
      notes: body.reason,
      performedById: session.user.id,
    },
  });

  return NextResponse.json({
    data: accreditation,
    message: 'Accreditation revoked',
  });
}, { requireAuth: true });
