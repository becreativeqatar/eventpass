'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useEventContext } from '@/contexts/event-context';

interface SummaryReport {
  accreditations: number;
  scans: number;
  pendingApprovals: number;
}

interface CompanyReport {
  company: string;
  total: number;
  PENDING?: number;
  APPROVED?: number;
  REJECTED?: number;
  REVOKED?: number;
}

interface ScanActivityReport {
  date: string;
  total: number;
  ALLOWED?: number;
  DENIED?: number;
  WRONG_PHASE?: number;
}

export default function ReportsPage() {
  const { selectedProject, isLoading } = useEventContext();
  const [reportType, setReportType] = useState<string>('summary');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryReport | null>(null);
  const [companyData, setCompanyData] = useState<CompanyReport[]>([]);
  const [scanData, setScanData] = useState<ScanActivityReport[]>([]);

  const fetchReport = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const url = `/api/reports?type=${reportType}&projectId=${selectedProject.id}`;
      const res = await fetch(url);
      const data = await res.json();

      switch (reportType) {
        case 'summary':
          setSummaryData(data.data);
          break;
        case 'by-company':
          setCompanyData(data.data || []);
          break;
        case 'scan-activity':
          setScanData(data.data || []);
          break;
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) fetchReport();
  }, [reportType, selectedProject]);

  const exportReport = async () => {
    if (!selectedProject) return;
    window.open(`/api/export?projectId=${selectedProject.id}`, '_blank');
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold mb-2">No Active Event</h2>
        <p className="text-muted-foreground mb-4">Activate an event to view reports.</p>
        <Link href="/admin/events"><Button>Manage Events</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Statistics and analytics for {selectedProject.name}</p>
        </div>
        <Button onClick={exportReport} className="w-full sm:w-auto">Export to Excel</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="by-company">By Company</SelectItem>
                  <SelectItem value="scan-activity">Scan Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading report...</CardContent></Card>
      ) : (
        <>
          {reportType === 'summary' && summaryData && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Accreditations</CardDescription>
                  <CardTitle className="text-4xl">{summaryData.accreditations}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Scans</CardDescription>
                  <CardTitle className="text-4xl">{summaryData.scans}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Approvals</CardDescription>
                  <CardTitle className="text-4xl text-orange-500">{summaryData.pendingApprovals}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {reportType === 'by-company' && (
            <Card>
              <CardHeader><CardTitle>Accreditations by Company</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Revoked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.company}</TableCell>
                        <TableCell className="text-right">{row.total}</TableCell>
                        <TableCell className="text-right text-orange-500">{row.PENDING || 0}</TableCell>
                        <TableCell className="text-right text-green-500">{row.APPROVED || 0}</TableCell>
                        <TableCell className="text-right text-red-500">{row.REJECTED || 0}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.REVOKED || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {reportType === 'scan-activity' && (
            <Card>
              <CardHeader><CardTitle>Scan Activity by Date</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Scans</TableHead>
                      <TableHead className="text-right">Allowed</TableHead>
                      <TableHead className="text-right">Denied</TableHead>
                      <TableHead className="text-right">Wrong Phase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.date}</TableCell>
                        <TableCell className="text-right">{row.total}</TableCell>
                        <TableCell className="text-right text-green-500">{row.ALLOWED || 0}</TableCell>
                        <TableCell className="text-right text-red-500">{row.DENIED || 0}</TableCell>
                        <TableCell className="text-right text-orange-500">{row.WRONG_PHASE || 0}</TableCell>
                      </TableRow>
                    ))}
                    {scanData.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No scan data available</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
