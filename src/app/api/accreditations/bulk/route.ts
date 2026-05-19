import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'delete']),
  ids: z.array(z.string()).min(1, 'At least one ID required'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { action, ids, reason } = result.data;
  let affected = 0;

  try {
    await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        const updated = await tx.accreditation.updateMany({
          where: { id: { in: ids }, status: 'PENDING' },
          data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: new Date() },
        });
        affected = updated.count;

        // Create history entries
        for (const id of ids) {
          await tx.accreditationHistory.create({
            data: {
              accreditationId: id,
              action: 'APPROVED',
              oldStatus: 'PENDING',
              newStatus: 'APPROVED',
              notes: 'Bulk approved',
              performedById: session.user.id,
            },
          }).catch(() => { /* skip if accreditation wasn't PENDING */ });
        }
      } else if (action === 'reject') {
        const updated = await tx.accreditation.updateMany({
          where: { id: { in: ids }, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
        affected = updated.count;

        for (const id of ids) {
          await tx.accreditationHistory.create({
            data: {
              accreditationId: id,
              action: 'REJECTED',
              oldStatus: 'PENDING',
              newStatus: 'REJECTED',
              notes: reason || 'Bulk rejected',
              performedById: session.user.id,
            },
          }).catch(() => {});
        }
      } else if (action === 'delete') {
        // Only allow deleting DRAFT records
        const deleted = await tx.accreditation.deleteMany({
          where: { id: { in: ids }, status: 'DRAFT' },
        });
        affected = deleted.count;
      }
    });

    return NextResponse.json({ success: true, affected });
  } catch (err) {
    console.error('[bulk] Error:', err);
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
