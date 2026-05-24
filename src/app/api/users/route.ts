import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { generatePasswordToken } from '@/lib/tokens';
import { sendInviteEmail } from '@/lib/email';
import { z } from 'zod';

const VALID_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'VALIDATOR'] as const;

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(VALID_ROLES).default('STAFF'),
});

const querySchema = z.object({
  q: z.string().optional(),
  role: z.enum(VALID_ROLES).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
});

// GET /api/users - List all users
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const queryResult = querySchema.safeParse({
    q: searchParams.get('q') || undefined,
    role: searchParams.get('role') || undefined,
    p: searchParams.get('p') || 1,
    ps: searchParams.get('ps') || 20,
  });
  if (!queryResult.success) {
    return NextResponse.json({ error: queryResult.error.issues[0].message }, { status: 400 });
  }
  const query = queryResult.data;

  const where = {
    ...(query.role && { role: query.role }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' as const } },
        { email: { contains: query.q, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            accreditations: true,
            scans: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.p - 1) * query.ps,
      take: query.ps,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    pagination: {
      page: query.p,
      pageSize: query.ps,
      total,
      totalPages: Math.ceil(total / query.ps),
    },
  });
}, { requireAuth: true });

// POST /api/users - Create new user + send invite
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }
  const data = result.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 }
    );
  }

  // Create user without password — they'll set it via invite link
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // Generate invite token and send email
  const token = await generatePasswordToken(user.email, 24);
  await sendInviteEmail(user.email, user.name || '', token);

  return NextResponse.json({ data: user }, { status: 201 });
}, { requireAuth: true });
