import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSelectedProject } from '@/lib/active-project';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getSelectedProject();

    if (!project) {
      return NextResponse.json({ data: null, project: null });
    }

    const formatted = {
      ...project,
      accessGroups: project.accessGroups
        ? project.accessGroups.split(',').map((g) => g.trim())
        : [],
    };

    return NextResponse.json({ data: formatted, project: formatted });
  } catch (error) {
    console.error('Error fetching active project:', error);
    return NextResponse.json({ error: 'Failed to fetch active project' }, { status: 500 });
  }
}
