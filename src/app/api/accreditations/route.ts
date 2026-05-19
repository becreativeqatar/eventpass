import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import {
  createAccreditationSchema,
  accreditationQuerySchema,
  phasesToString,
  stringToPhases,
  getPhases,
} from '@/lib/validations/accreditation';

// Helper to transform accreditation for response (convert phases string to array)
function transformAccreditation(acc: { phases: string; [key: string]: unknown }) {
  return {
    ...acc,
    phases: stringToPhases(acc.phases),
  };
}

// Generate unique accreditation number (ACC-0001, ACC-0002, etc.)
async function generateAccreditationNumber(): Promise<string> {
  const lastAccreditation = await prisma.accreditation.findFirst({
    orderBy: { accreditationNumber: 'desc' },
    select: { accreditationNumber: true },
  });

  let nextNumber = 1;
  if (lastAccreditation?.accreditationNumber) {
    const match = lastAccreditation.accreditationNumber.match(/ACC-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `ACC-${nextNumber.toString().padStart(4, '0')}`;
}

// GET /api/accreditations - List accreditations
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = accreditationQuerySchema.parse({
    projectId: searchParams.get('projectId') || undefined,
    status: searchParams.get('status') || undefined,
    q: searchParams.get('q') || undefined,
    p: searchParams.get('p') || 1,
    ps: searchParams.get('ps') || 20,
    sort: searchParams.get('sort') || 'createdAt',
    order: searchParams.get('order') || 'desc',
  });

  const where = {
    ...(query.projectId && { projectId: query.projectId }),
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { firstName: { contains: query.q } },
        { lastName: { contains: query.q } },
        { email: { contains: query.q } },
        { company: { contains: query.q } },
      ],
    }),
  };

  const [accreditations, total] = await Promise.all([
    prisma.accreditation.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { [query.sort]: query.order },
      skip: (query.p - 1) * query.ps,
      take: query.ps,
    }),
    prisma.accreditation.count({ where }),
  ]);

  return NextResponse.json({
    data: accreditations.map(transformAccreditation),
    pagination: {
      page: query.p,
      pageSize: query.ps,
      total,
      totalPages: Math.ceil(total / query.ps),
    },
  });
}, { requireAuth: true });

// POST /api/accreditations - Create new accreditation
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const data = createAccreditationSchema.parse(body);

  // Verify project exists
  const project = await prisma.accreditationProject.findUnique({
    where: { id: data.projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Compute phases from access flags or use provided phases
  const { phases: providedPhases, ...restData } = data;
  const computedPhases = providedPhases || getPhases(data);

  // Generate unique accreditation number
  const accreditationNumber = await generateAccreditationNumber();

  const accreditation = await prisma.accreditation.create({
    data: {
      ...restData,
      accreditationNumber,
      phases: phasesToString(computedPhases),
      createdById: session.user.id,
    },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify admin if submitted for approval (fire-and-forget)
  if (accreditation.status === 'PENDING') {
    const { notifyAdminOfPendingApproval } = await import('@/lib/notifications');
    void notifyAdminOfPendingApproval({
      firstName: accreditation.firstName,
      lastName: accreditation.lastName,
      company: accreditation.company,
      role: accreditation.role,
      accreditationNumber: accreditation.accreditationNumber,
    }).catch(console.error);
  }

  return NextResponse.json({ data: transformAccreditation(accreditation) }, { status: 201 });
}, { requireAuth: true });
