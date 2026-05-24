import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Auto-complete active events whose bump-out phase has ended.
 * Called lazily when events are fetched.
 */
export async function autoCompleteExpiredEvents() {
  const now = new Date();
  await prisma.accreditationProject.updateMany({
    where: {
      status: 'ACTIVE',
      bumpOutEnd: { not: null, lt: now },
    },
    data: { status: 'COMPLETED' },
  });
}

export async function getActiveProject() {
  await autoCompleteExpiredEvents();
  const project = await prisma.accreditationProject.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  return project;
}

export async function requireActiveProject() {
  const project = await getActiveProject();
  if (!project) {
    throw new Error('No active event configured');
  }
  return project;
}

export async function getSelectedProject() {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('ep_selected_event')?.value;

  if (selectedId) {
    const project = await prisma.accreditationProject.findFirst({
      where: {
        OR: [
          { id: selectedId },
          { code: { equals: selectedId, mode: 'insensitive' } },
        ],
      },
    });
    if (project) return project;
  }

  return getActiveProject();
}
