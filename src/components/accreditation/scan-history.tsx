'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScanLine, Monitor, MapPin, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Scan {
  id: string;
  phase: string;
  result: string;
  location: string | null;
  notes: string | null;
  device: string | null;
  ipAddress: string | null;
  scannedAt: string;
  scannedBy: { name: string | null; email: string };
  accreditation?: {
    accreditationNumber: string;
    firstName: string;
    lastName: string;
    company: string | null;
  };
}

interface ScanHistoryProps {
  accreditationId?: string;
  projectId?: string;
  title?: string;
  showAccreditation?: boolean;
  showExport?: boolean;
}

const RESULT_COLORS: Record<string, string> = {
  ALLOWED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  WRONG_PHASE: 'bg-orange-100 text-orange-800',
};

export function ScanHistory({
  accreditationId,
  projectId,
  title = 'Scan History',
  showAccreditation = false,
  showExport = false,
}: ScanHistoryProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchScans();
  }, [accreditationId, projectId, pagination.page]);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (accreditationId) params.set('accreditationId', accreditationId);
      if (projectId) params.set('projectId', projectId);

      const res = await fetch(`/api/scans?${params.toString()}`);
      const data = await res.json();
      setScans(data.data || []);
      if (data.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err);
      toast.error('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting scans...', { id: 'export-scans' });
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (accreditationId) params.set('accreditationId', accreditationId);

      const res = await fetch(`/api/scans/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scans-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Scans exported successfully', { id: 'export-scans' });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export scans', { id: 'export-scans' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {pagination.total} total scan{pagination.total !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        {showExport && scans.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No scans recorded yet
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    {showAccreditation && <TableHead>Person</TableHead>}
                    <TableHead>Phase</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Scanned By</TableHead>
                    <TableHead>Device Info</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(scan.scannedAt).toLocaleString()}
                      </TableCell>
                      {showAccreditation && scan.accreditation && (
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {scan.accreditation.firstName} {scan.accreditation.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {scan.accreditation.accreditationNumber}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="secondary">{scan.phase.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={RESULT_COLORS[scan.result] || 'bg-gray-100'}>
                          {scan.result.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scan.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {scan.location}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{scan.scannedBy.name || scan.scannedBy.email}</TableCell>
                      <TableCell>
                        {scan.device || scan.ipAddress ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <Monitor className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                    {scan.ipAddress || 'Device info'}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <div className="text-xs space-y-1">
                                  {scan.ipAddress && <div><strong>IP:</strong> {scan.ipAddress}</div>}
                                  {scan.device && <div><strong>Device:</strong> {scan.device}</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {scan.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
