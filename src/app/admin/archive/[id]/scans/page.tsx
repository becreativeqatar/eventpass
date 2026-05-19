'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScanLine } from 'lucide-react';

interface Scan {
  id: string;
  phase: string;
  result: string;
  location: string | null;
  scannedAt: string;
  accreditation: {
    firstName: string;
    lastName: string;
    company: string | null;
  };
  scannedBy: { name: string | null; email: string };
}

const RESULT_COLORS: Record<string, string> = {
  ALLOWED: 'bg-success/10 text-success',
  DENIED: 'bg-destructive/10 text-destructive',
  REVOKED: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-muted text-muted-foreground',
  WRONG_PHASE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
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
  { key: 'scannedBy', header: 'Scanned By', render: (scan) => scan.scannedBy.name || scan.scannedBy.email },
  { key: 'time', header: 'Time', render: (scan) => new Date(scan.scannedAt).toLocaleString() },
];

export default function ArchiveScansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedResult, setSelectedResult] = useState('all');

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      const params = new URLSearchParams({ projectId, limit: '100' });
      if (selectedPhase !== 'all') params.set('phase', selectedPhase);
      if (selectedResult !== 'all') params.set('result', selectedResult);
      try {
        const res = await fetch(`/api/scans?${params}`);
        const data = await res.json();
        setScans(data.data || []);
      } catch (err) {
        console.error('Failed to fetch scans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, [projectId, selectedPhase, selectedResult]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scan History</h1>
        <p className="text-muted-foreground">Scan logs for this archived event</p>
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
                </SelectContent>
              </Select>
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
        emptyDescription="No scan records for this event."
      />
    </div>
  );
}
