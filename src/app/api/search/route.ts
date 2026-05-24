import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSelectedProject } from '@/lib/active-project';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ accreditations: [], users: [] });
  }

  const activeProject = await getSelectedProject();

  const accreditations = activeProject
    ? await prisma.accreditation.findMany({
        where: {
          projectId: activeProject.id,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { company: { contains: q, mode: 'insensitive' as const } },
            { accreditationNumber: { contains: q, mode: 'insensitive' as const } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          accreditationNumber: true,
          status: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      })
    : [];

  // Only return users for ADMIN role
  const users =
    session.user.role === 'ADMIN'
      ? await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          take: 5,
        })
      : [];

  return NextResponse.json({ accreditations, users });
}
