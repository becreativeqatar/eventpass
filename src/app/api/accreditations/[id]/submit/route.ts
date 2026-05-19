import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { AccreditationStatus } from '@/lib/validations/accreditation';

// PATCH /api/accreditations/[id]/submit - Submit a draft accreditation for approval
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

  const existing = await prisma.accreditation.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  // Only the creator or an admin can submit
  if (existing.createdById !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (existing.status !== AccreditationStatus.PENDING) {
    return NextResponse.json(
      { error: `Cannot submit accreditation with status ${existing.status}` },
      { status: 400 }
    );
  }

  // For now, submitting keeps status as PENDING but could trigger a workflow
  // This is where you might send notifications to approvers

  await prisma.accreditationHistory.create({
    data: {
      accreditationId: id,
      action: 'SUBMITTED',
      oldStatus: AccreditationStatus.PENDING,
      newStatus: AccreditationStatus.PENDING,
      notes: 'Submitted for approval',
      performedById: session.user.id,
    },
  });

  // Notify admin (fire-and-forget)
  const { notifyAdminOfPendingApproval } = await import('@/lib/notifications');
  void notifyAdminOfPendingApproval({
    firstName: existing.firstName,
    lastName: existing.lastName,
    company: existing.company,
    role: existing.role,
    accreditationNumber: existing.accreditationNumber,
  }).catch(console.error);

  return NextResponse.json({
    data: existing,
    message: 'Accreditation submitted for approval',
  });
}, { requireAuth: true });
