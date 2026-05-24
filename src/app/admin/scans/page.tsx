'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTable, type Column } from '@/components/data-table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScanLine, Download } from 'lucide-react';
import { useEventContext } from '@/contexts/event-context';

interface Scan {
  id: string;
  phase: string;
  result: string;
  location: string | null;
  notes: string | null;
  scannedAt: string;
  accreditation: {
    firstName: string;
    lastName: string;
    company: string | null;
    role: string | null;
    project: { id: string; name: string };
  };
  scannedBy: { id: string; name: string | null; email: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const RESULT_COLORS: Record<string, string> = {
  ALLOWED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-muted text-muted-foreground',
  WRONG_PHASE: 'bg-orange-100 text-orange-800',
};

const columns: Column<Scan>[] = [
  {
    key: 'person',
    header: 'Person',
    render: (scan) => (
      <div>
        <div className="font-medium">{scan.accreditation.firstName} {scan.accreditation.lastName}</div>
        {scan.accreditation.company && <div className="text-sm text-muted-foreground">{scan.accreditation.company}</div>}
      </div>
    ),
  },
  { key: 'phase', header: 'Phase', render: (scan) => <Badge variant="secondary">{scan.phase.replace('_', ' ')}</Badge> },
  { key: 'result', header: 'Result', render: (scan) => <Badge className={RESULT_COLORS[scan.result] || 'bg-muted'}>{scan.result.replace('_', ' ')}</Badge> },
  { key: 'location', header: 'Location', render: (scan) => scan.location || '-', mobileRender: false },
  { key: 'scannedBy', header: 'Scanned By', render: (scan) => scan.scannedBy.name || scan.scannedBy.email, mobileRender: false },
  {
    key: 'time', header: 'Time', render: (scan) => new Date(scan.scannedAt).toLocaleString(),
    mobileRender: (scan) => <span className="text-xs">{new Date(scan.scannedAt).toLocaleString()}</span>,
  },
];

export default function ScansPage() {
  const { selectedProject, isLoading } = useEventContext();
  const [scans, setScans] = useState<Scan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchScans = async (page = 1) => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      params.set('projectId', selectedProject.id);

      if (selectedPhase !== 'all') params.set('phase', selectedPhase);
      if (selectedResult !== 'all') params.set('result', selectedResult);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/scans?${params}`);
      const data = await res.json();
      setScans(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) fetchScans(1);
  }, [selectedProject, selectedPhase, selectedResult, fromDate, toDate]);

  const exportScans = () => {
    if (!selectedProject) return;
    const params = new URLSearchParams({ projectId: selectedProject.id });
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    window.open(`/api/scans/export?${params}`, '_blank');
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold mb-2">No Active Event</h2>
        <p className="text-muted-foreground mb-4">Activate an event to view scans.</p>
        <Link href="/admin/events"><Button>Manage Events</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scan History</h1>
          <p className="text-muted-foreground">QR code scans and verification attempts</p>
        </div>
        <Button onClick={exportScans}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  <SelectItem value="BUMP_IN">Bump In</SelectItem>
                  <SelectItem value="LIVE">Live</SelectItem>
                  <SelectItem value="BUMP_OUT">Bump Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Result</Label>
              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="ALLOWED">Allowed</SelectItem>
                  <SelectItem value="DENIED">Denied</SelectItem>
                  <SelectItem value="WRONG_PHASE">Wrong Phase</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <DatePicker
                value={fromDate}
                onChange={(date) => setFromDate(date?.toISOString().split('T')[0] ?? '')}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <DatePicker
                value={toDate}
                onChange={(date) => setToDate(date?.toISOString().split('T')[0] ?? '')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={scans}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyIcon={ScanLine}
        emptyTitle="No scans found"
        emptyDescription="Scans will appear here as badges are verified."
        pagination={{ ...pagination, onPageChange: fetchScans }}
      />
    </div>
  );
}
