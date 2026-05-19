import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// GET /api/autocomplete/roles - Get unique role names for autocomplete
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const projectId = searchParams.get('projectId');

  const where: Record<string, unknown> = {
    role: {
      not: null,
      contains: query,
    },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const accreditations = await prisma.accreditation.findMany({
    where,
    select: { role: true },
    distinct: ['role'],
    take: 20,
  });

  const roles = accreditations
    .map((a) => a.role)
    .filter((r): r is string => r !== null);

  return NextResponse.json({ data: roles });
}, { requireAuth: true });
