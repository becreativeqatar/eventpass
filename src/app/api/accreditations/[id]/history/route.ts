import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// GET /api/accreditations/[id]/history - Get accreditation history
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

  const history = await prisma.accreditationHistory.findMany({
    where: { accreditationId: id },
    include: {
      performedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { performedAt: 'desc' },
  });

  return NextResponse.json({ data: history });
}, { requireAuth: true });
