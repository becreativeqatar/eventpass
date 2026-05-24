import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// GET /api/autocomplete/companies - Get unique company names for autocomplete
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const projectId = searchParams.get('projectId');

  const where: Record<string, unknown> = {
    company: {
      not: null,
      contains: query,
      mode: 'insensitive',
    },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const accreditations = await prisma.accreditation.findMany({
    where,
    select: { company: true },
    distinct: ['company'],
    take: 20,
  });

  const companies = accreditations
    .map((a) => a.company)
    .filter((c): c is string => c !== null);

  return NextResponse.json({ data: companies });
}, { requireAuth: true });
