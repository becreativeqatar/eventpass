import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { AccreditationStatus } from '@/lib/validations/accreditation';
import { toQatarDateString } from '@/lib/date';

// GET /api/reports - Get aggregated reports
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('type') || 'summary';
  const projectId = searchParams.get('projectId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFilter: Record<string, unknown> = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) {
      (dateFilter.createdAt as Record<string, Date>).gte = new Date(from);
    }
    if (to) {
      (dateFilter.createdAt as Record<string, Date>).lte = new Date(to);
    }
  }

  switch (reportType) {
    case 'summary': {
      // Overall summary
      const [projects, accreditations, scans, pendingApprovals] = await Promise.all([
        prisma.accreditationProject.count({
          where: projectId ? { id: projectId } : {},
        }),
        prisma.accreditation.count({
          where: { ...(projectId ? { projectId } : {}), ...dateFilter },
        }),
        prisma.accreditationScan.count({
          where: projectId ? { accreditation: { projectId } } : {},
        }),
        prisma.accreditation.count({
          where: {
            status: AccreditationStatus.PENDING,
            ...(projectId ? { projectId } : {}),
          },
        }),
      ]);

      return NextResponse.json({
        data: {
          projects,
          accreditations,
          scans,
          pendingApprovals,
        },
      });
    }

    case 'by-project': {
      // Accreditations grouped by project
      const projects = await prisma.accreditationProject.findMany({
        include: {
          _count: {
            select: { accreditations: true },
          },
          accreditations: {
            select: { status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const report = projects.map((p) => {
        const statusCounts: Record<string, number> = {};
        p.accreditations.forEach((a) => {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        });

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          eventDate: p.eventDate,
          total: p._count.accreditations,
          ...statusCounts,
        };
      });

      return NextResponse.json({ data: report });
    }

    case 'by-company': {
      // Accreditations grouped by company
      const accreditations = await prisma.accreditation.findMany({
        where: {
          company: { not: null },
          ...(projectId ? { projectId } : {}),
          ...dateFilter,
        },
        select: { company: true, status: true },
      });

      const byCompany: Record<string, { total: number; statuses: Record<string, number> }> = {};

      accreditations.forEach((a) => {
        const company = a.company || 'Unknown';
        if (!byCompany[company]) {
          byCompany[company] = { total: 0, statuses: {} };
        }
        byCompany[company].total++;
        byCompany[company].statuses[a.status] =
          (byCompany[company].statuses[a.status] || 0) + 1;
      });

      const report = Object.entries(byCompany)
        .map(([company, data]) => ({
          company,
          total: data.total,
          ...data.statuses,
        }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({ data: report });
    }

    case 'scan-activity': {
      // Scans over time
      const scans = await prisma.accreditationScan.findMany({
        where: projectId ? { accreditation: { projectId } } : {},
        select: {
          scannedAt: true,
          result: true,
          phase: true,
        },
        orderBy: { scannedAt: 'asc' },
      });

      // Group by date
      const byDate: Record<string, { total: number; results: Record<string, number> }> = {};

      scans.forEach((s) => {
        const date = toQatarDateString(s.scannedAt);
        if (!byDate[date]) {
          byDate[date] = { total: 0, results: {} };
        }
        byDate[date].total++;
        byDate[date].results[s.result] = (byDate[date].results[s.result] || 0) + 1;
      });

      const report = Object.entries(byDate).map(([date, data]) => ({
        date,
        total: data.total,
        ...data.results,
      }));

      return NextResponse.json({ data: report });
    }

    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }
}, { requireAuth: true });
