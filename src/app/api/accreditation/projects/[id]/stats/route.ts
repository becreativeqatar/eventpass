import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get project statistics
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

    // Get accreditation counts by status
    const [totalAccreditations, draftAccreditations, pendingAccreditations, approvedAccreditations, rejectedAccreditations, totalScans] = await Promise.all([
      prisma.accreditation.count({ where: { projectId: id } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'DRAFT' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'PENDING' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'APPROVED' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'REJECTED' } }),
      prisma.accreditationScan.count({ where: { accreditation: { projectId: id } } }),
    ]);

    return NextResponse.json({
      totalAccreditations,
      draftAccreditations,
      pendingAccreditations,
      approvedAccreditations,
      rejectedAccreditations,
      totalScans,
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return NextResponse.json({ error: 'Failed to fetch project stats' }, { status: 500 });
  }
}
