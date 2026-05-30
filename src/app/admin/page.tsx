export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { getSelectedProject } from '@/lib/active-project';
import { AccreditationStatus } from '@/lib/validations/accreditation';
import { formatQatarDate } from '@/lib/date';
import { PendingApprovals } from '@/components/dashboard/pending-approvals';
import {
  Plus,
  Upload,
  BarChart3,
  QrCode,
  Calendar,
  ChevronRight,
} from 'lucide-react';

const STATUS_DOT_COLOR: Record<string, string> = {
  DRAFT: 'bg-muted-foreground',
  PENDING: 'bg-warning',
  APPROVED: 'bg-success',
  REJECTED: 'bg-destructive',
  REVOKED: 'bg-destructive',
};

async function getStats(projectId: string) {
  const [accreditations, approved, pendingApprovals, scans] = await Promise.all([
    prisma.accreditation.count({ where: { projectId } }),
    prisma.accreditation.count({
      where: { projectId, status: AccreditationStatus.APPROVED },
    }),
    prisma.accreditation.count({
      where: { projectId, status: AccreditationStatus.PENDING },
    }),
    prisma.accreditationScan.count({
      where: { accreditation: { projectId } },
    }),
  ]);

  return { accreditations, approved, pendingApprovals, scans };
}

async function getPendingApprovals(projectId: string) {
  return prisma.accreditation.findMany({
    where: { projectId, status: AccreditationStatus.PENDING },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      role: true,
      createdAt: true,
    },
  });
}

async function getRecentActivity(projectId: string) {
  return prisma.accreditation.findMany({
    where: { projectId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
    },
  });
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function AdminDashboardPage() {
  const activeProject = await getSelectedProject();

  if (!activeProject) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to BCE EventPass</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Events</h3>
            <p className="text-muted-foreground mb-6">Create an event to get started.</p>
            <Link href="/admin/events">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Manage Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReadOnly = activeProject.status !== 'ACTIVE';

  const [stats, pending, recent] = await Promise.all([
    getStats(activeProject.id),
    getPendingApprovals(activeProject.id),
    getRecentActivity(activeProject.id),
  ]);

  return (
    <div className="space-y-5">
      {/* Event Header */}
      <div className="bg-gradient-to-r from-[#101820] to-[#1a2530] text-white rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Badge className={`border-0 text-[10px] uppercase tracking-wider shrink-0 ${activeProject.status === 'ACTIVE' ? 'bg-success text-white' : 'bg-white/20 text-white/80'}`}>
            {activeProject.status}
          </Badge>
          <span className="font-semibold text-sm truncate">{activeProject.name}</span>
        </div>
        <span className="text-xs text-white/60 shrink-0">
          {activeProject.eventDate && formatQatarDate(activeProject.eventDate)}
          {activeProject.venue && ` · ${activeProject.venue}`}
        </span>
      </div>

      {/* Two Equal Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT: Stats 2x2 + Pending Approvals */}
        <div className="space-y-5">

          {/* Stats 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/records">
              <div className="bg-card rounded-xl border p-4 border-t-2 border-t-secondary hover:border-t-secondary/80 transition-colors">
                <p className="text-2xl font-bold tabular-nums">{stats.accreditations}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total</p>
              </div>
            </Link>
            <Link href="/admin/records?status=APPROVED">
              <div className="bg-card rounded-xl border p-4 border-t-2 border-t-success hover:border-t-success/80 transition-colors">
                <p className="text-2xl font-bold tabular-nums text-success">{stats.approved}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Approved</p>
              </div>
            </Link>
            <Link href="/admin/records?status=PENDING">
              <div className="bg-card rounded-xl border p-4 border-t-2 border-t-warning hover:border-t-warning/80 transition-colors">
                <p className="text-2xl font-bold tabular-nums text-warning">{stats.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Pending</p>
              </div>
            </Link>
            <Link href="/admin/scans">
              <div className="bg-card rounded-xl border p-4 border-t-2 border-t-primary hover:border-t-primary/80 transition-colors">
                <p className="text-2xl font-bold tabular-nums">{stats.scans}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Scans</p>
              </div>
            </Link>
          </div>

          {/* Pending Approvals */}
          <PendingApprovals
            items={pending.map((item) => ({
              id: item.id,
              firstName: item.firstName,
              lastName: item.lastName,
              company: item.company,
              role: item.role,
            }))}
            totalCount={stats.pendingApprovals}
          />
        </div>

        {/* RIGHT: Quick Actions + Recent Activity */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <Card>
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-base">Quick Actions</h2>
            </div>
            <div className="p-2">
              {!isReadOnly && (
                <>
                  <Link href="/admin/records/new" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="w-8 h-8 rounded-lg bce-gradient flex items-center justify-center shrink-0">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium flex-1">New Record</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link href="/admin/import" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#8232a7]/10 flex items-center justify-center shrink-0">
                      <Upload className="h-4 w-4 text-[#8232a7]" />
                    </div>
                    <span className="text-sm font-medium flex-1">Bulk Import</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </>
              )}
              <Link href="/validator" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <QrCode className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm font-medium flex-1">QR Scanner</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm font-medium flex-1">Reports</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-base">Recent Activity</h2>
              <Link href="/admin/records" className="text-xs text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No recent activity
              </CardContent>
            ) : (
              <div className="p-4 space-y-3">
                {recent.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/records/${item.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLOR[item.status] || 'bg-muted-foreground'}`} />
                    <span className="text-sm flex-1 truncate">{item.firstName} {item.lastName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>

    </div>
  );
}
