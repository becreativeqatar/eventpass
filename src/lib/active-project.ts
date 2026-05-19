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
