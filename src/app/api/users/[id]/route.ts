import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';

const VALID_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'VALIDATOR'] as const;

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(VALID_ROLES).optional(),
});

// GET /api/users/[id] - Get single user
export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin can view user details
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projects: true,
          accreditations: true,
          scans: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}, { requireAuth: true });

// PATCH /api/users/[id] - Update user
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin can update users
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const body = await request.json();
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }
  const data = result.data;

  // Check user exists
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent self-demotion from admin
  if (id === session.user.id && data.role && data.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Cannot change your own admin role' },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: user });
}, { requireAuth: true });

// DELETE /api/users/[id] - Delete user
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin can delete users
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  // Check user exists
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}, { requireAuth: true });
