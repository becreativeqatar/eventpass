import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSelectedProject } from '@/lib/active-project';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const activeProject = await getSelectedProject();
  if (!activeProject) {
    return NextResponse.json({ stats: null });
  }

  const projectId = activeProject.id;

  const [total, approved, pending, rejected, draft, scans] = await Promise.all([
    prisma.accreditation.count({ where: { projectId } }),
    prisma.accreditation.count({ where: { projectId, status: 'APPROVED' } }),
    prisma.accreditation.count({ where: { projectId, status: 'PENDING' } }),
    prisma.accreditation.count({ where: { projectId, status: 'REJECTED' } }),
    prisma.accreditation.count({ where: { projectId, status: 'DRAFT' } }),
    prisma.accreditationScan.count({ where: { accreditation: { projectId } } }),
  ]);

  // Scan activity for last 7 days — fetch and group in JS for SQLite compatibility
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentScans = await prisma.accreditationScan.findMany({
    where: {
      accreditation: { projectId },
      scannedAt: { gte: sevenDaysAgo },
    },
    select: { scannedAt: true },
  });

  // Group by day
  const scansByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    scansByDay[key] = 0;
  }
  for (const scan of recentScans) {
    const key = new Date(scan.scannedAt).toISOString().split('T')[0];
    if (key in scansByDay) scansByDay[key]++;
  }

  const scanActivity = Object.entries(scansByDay).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    scans: count,
  }));

  return NextResponse.json({
    stats: { total, approved, pending, rejected, draft, scans },
    scanActivity,
    funnel: [
      { name: 'Draft', value: draft, color: 'var(--muted-foreground)' },
      { name: 'Pending', value: pending, color: 'var(--warning)' },
      { name: 'Approved', value: approved, color: 'var(--success)' },
      { name: 'Rejected', value: rejected, color: 'var(--destructive)' },
    ],
  });
}
