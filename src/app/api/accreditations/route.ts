import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { parsePhaseStart, parsePhaseEnd } from '@/lib/date';
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

// Generate unique accreditation number scoped to event (e.g., TEST-0001)
async function generateAccreditationNumber(projectId: string, eventCode: string): Promise<string> {
  const prefix = eventCode.toUpperCase();
  const lastAccreditation = await prisma.accreditation.findFirst({
    where: { projectId },
    orderBy: { accreditationNumber: 'desc' },
    select: { accreditationNumber: true },
  });

  let nextNumber = 1;
  if (lastAccreditation?.accreditationNumber) {
    const match = lastAccreditation.accreditationNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
}

// GET /api/accreditations - List accreditations
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryResult = accreditationQuerySchema.safeParse({
    projectId: searchParams.get('projectId') || undefined,
    status: searchParams.get('status') || undefined,
    q: searchParams.get('q') || undefined,
    p: searchParams.get('p') || 1,
    ps: searchParams.get('ps') || 20,
    sort: searchParams.get('sort') || 'createdAt',
    order: searchParams.get('order') || 'desc',
  });
  if (!queryResult.success) {
    return NextResponse.json({ error: queryResult.error.issues[0].message }, { status: 400 });
  }
  const query = queryResult.data;

  const where = {
    ...(query.projectId && { projectId: query.projectId }),
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { firstName: { contains: query.q, mode: 'insensitive' as const } },
        { lastName: { contains: query.q, mode: 'insensitive' as const } },
        { email: { contains: query.q, mode: 'insensitive' as const } },
        { company: { contains: query.q, mode: 'insensitive' as const } },
        { accreditationNumber: { contains: query.q, mode: 'insensitive' as const } },
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
  const result = createAccreditationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }
  const data = result.data;

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

  // Convert phase date strings to Qatar timezone (start=00:00, end=23:59:59 Qatar)
  const qatarDates = {
    bumpInStart: parsePhaseStart(restData.bumpInStart as string | null),
    bumpInEnd: parsePhaseEnd(restData.bumpInEnd as string | null),
    liveStart: parsePhaseStart(restData.liveStart as string | null),
    liveEnd: parsePhaseEnd(restData.liveEnd as string | null),
    bumpOutStart: parsePhaseStart(restData.bumpOutStart as string | null),
    bumpOutEnd: parsePhaseEnd(restData.bumpOutEnd as string | null),
    qidExpiry: parsePhaseEnd(restData.qidExpiry as string | null),
    passportExpiry: parsePhaseEnd(restData.passportExpiry as string | null),
    hayyaExpiry: parsePhaseEnd(restData.hayyaExpiry as string | null),
  };

  // Generate unique accreditation number scoped to event
  const accreditationNumber = await generateAccreditationNumber(project.id, project.code || project.id.slice(0, 6));

  const accreditation = await prisma.accreditation.create({
    data: {
      ...restData,
      ...qatarDates,
      accreditationNumber,
      phases: phasesToString(computedPhases),
      createdById: session.user.id,
    },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Log creation in history
  await prisma.accreditationHistory.create({
    data: {
      accreditationId: accreditation.id,
      action: 'CREATED',
      newStatus: accreditation.status,
      performedById: session.user.id,
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
