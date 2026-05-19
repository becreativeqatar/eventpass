import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// GET /api/scans - List all scans with filtering
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const accreditationId = searchParams.get('accreditationId');
  const phase = searchParams.get('phase');
  const result = searchParams.get('result');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: Record<string, unknown> = {};

  if (projectId) {
    where.accreditation = { projectId };
  }

  if (accreditationId) {
    where.accreditationId = accreditationId;
  }

  if (phase) {
    where.phase = phase;
  }

  if (result) {
    where.result = result;
  }

  const scannedById = searchParams.get('scannedById');
  if (scannedById) {
    where.scannedById = scannedById;
  }

  if (from || to) {
    where.scannedAt = {};
    if (from) {
      (where.scannedAt as Record<string, Date>).gte = new Date(from);
    }
    if (to) {
      (where.scannedAt as Record<string, Date>).lte = new Date(to);
    }
  }

  const [scans, total] = await Promise.all([
    prisma.accreditationScan.findMany({
      where,
      include: {
        accreditation: {
          select: {
            accreditationNumber: true,
            firstName: true,
            lastName: true,
            company: true,
            role: true,
            project: { select: { id: true, name: true } },
          },
        },
        scannedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scannedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accreditationScan.count({ where }),
  ]);

  return NextResponse.json({
    data: scans,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}, { requireAuth: true });
