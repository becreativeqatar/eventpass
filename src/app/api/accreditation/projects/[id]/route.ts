import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get a single accreditation project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.accreditationProject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { accreditations: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse accessGroups from comma-separated string to array
    const formattedProject = {
      ...project,
      accessGroups: project.accessGroups ? project.accessGroups.split(',').map((g) => g.trim()) : [],
    };

    return NextResponse.json({ project: formattedProject });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT - Update an accreditation project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, code, status, description, venue, eventDate, bumpInStart, bumpInEnd, liveStart, liveEnd, bumpOutStart, bumpOutEnd, accessGroups } = body;

    // Convert accessGroups array to comma-separated string
    const accessGroupsStr = Array.isArray(accessGroups) ? accessGroups.join(',') : undefined;

    const project = await prisma.accreditationProject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code || null }),
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description: description || null }),
        ...(venue !== undefined && { venue: venue || null }),
        ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
        ...(bumpInStart !== undefined && { bumpInStart: bumpInStart ? new Date(bumpInStart) : null }),
        ...(bumpInEnd !== undefined && { bumpInEnd: bumpInEnd ? new Date(bumpInEnd) : null }),
        ...(liveStart !== undefined && { liveStart: liveStart ? new Date(liveStart) : null }),
        ...(liveEnd !== undefined && { liveEnd: liveEnd ? new Date(liveEnd) : null }),
        ...(bumpOutStart !== undefined && { bumpOutStart: bumpOutStart ? new Date(bumpOutStart) : null }),
        ...(bumpOutEnd !== undefined && { bumpOutEnd: bumpOutEnd ? new Date(bumpOutEnd) : null }),
        ...(accessGroupsStr !== undefined && { accessGroups: accessGroupsStr }),
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE - Delete an accreditation project (only if no records exist)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if project has any accreditations
    const accreditationCount = await prisma.accreditation.count({
      where: { projectId: id },
    });

    if (accreditationCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete project with existing accreditations' },
        { status: 400 }
      );
    }

    await prisma.accreditationProject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
