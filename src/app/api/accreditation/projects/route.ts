import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List all accreditation projects
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.accreditationProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { accreditations: true },
        },
      },
    });

    // Parse accessGroups from comma-separated string to array
    const formattedProjects = projects.map((p) => ({
      ...p,
      accessGroups: p.accessGroups ? p.accessGroups.split(',').map((g) => g.trim()) : [],
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST - Create a new accreditation project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, bumpInStart, bumpInEnd, liveStart, liveEnd, bumpOutStart, bumpOutEnd, accessGroups } = body;

    // Validate required fields
    if (!name || !code || !bumpInStart || !bumpInEnd || !liveStart || !liveEnd || !bumpOutStart || !bumpOutEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate code
    const existingProject = await prisma.accreditationProject.findUnique({
      where: { code },
    });

    if (existingProject) {
      return NextResponse.json({ error: 'Project code already exists' }, { status: 400 });
    }

    // Convert accessGroups array to comma-separated string
    const accessGroupsStr = Array.isArray(accessGroups) ? accessGroups.join(',') : 'General';

    const project = await prisma.accreditationProject.create({
      data: {
        name,
        code,
        bumpInStart: new Date(bumpInStart),
        bumpInEnd: new Date(bumpInEnd),
        liveStart: new Date(liveStart),
        liveEnd: new Date(liveEnd),
        bumpOutStart: new Date(bumpOutStart),
        bumpOutEnd: new Date(bumpOutEnd),
        accessGroups: accessGroupsStr,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
