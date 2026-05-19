import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { AccreditationStatus } from '@/lib/validations/accreditation';
import { Calendar, MapPin, Users, FileText, ScanLine, BarChart3 } from 'lucide-react';

async function getEvent(id: string) {
  const event = await prisma.accreditationProject.findUnique({
    where: { id },
    include: { _count: { select: { accreditations: true } } },
  });
  return event;
}

async function getStats(id: string) {
  const [total, pending, approved, rejected, scans] = await Promise.all([
    prisma.accreditation.count({ where: { projectId: id } }),
    prisma.accreditation.count({ where: { projectId: id, status: AccreditationStatus.PENDING } }),
    prisma.accreditation.count({ where: { projectId: id, status: AccreditationStatus.APPROVED } }),
    prisma.accreditation.count({ where: { projectId: id, status: AccreditationStatus.REJECTED } }),
    prisma.accreditationScan.count({ where: { accreditation: { projectId: id } } }),
  ]);
  return { total, pending, approved, rejected, scans };
}

export default async function ArchiveEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, stats] = await Promise.all([getEvent(id), getStats(id)]);

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-muted text-muted-foreground">{event.status}</Badge>
          <span className="text-sm text-muted-foreground">{event.code}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        {event.description && <p className="text-muted-foreground">{event.description}</p>}
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          {event.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.venue}</span>}
          {event.eventDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(event.eventDate).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scans</CardDescription>
            <CardTitle className="text-3xl">{stats.scans}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/admin/archive/${id}/records`}>
          <Card className="transition-colors hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Records</p>
                <p className="text-sm text-muted-foreground">View all accreditation records</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/archive/${id}/reports`}>
          <Card className="transition-colors hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Reports</p>
                <p className="text-sm text-muted-foreground">Analytics and statistics</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/archive/${id}/scans`}>
          <Card className="transition-colors hover:border-primary/30">
            <CardContent className="flex items-center gap-4 py-4">
              <ScanLine className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Scan History</p>
                <p className="text-sm text-muted-foreground">View all scan logs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
