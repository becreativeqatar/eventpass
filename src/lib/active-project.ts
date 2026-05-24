import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function getActiveProject() {
  const project = await prisma.accreditationProject.findFirst({
    where: { status: 'ACTIVE' },
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
