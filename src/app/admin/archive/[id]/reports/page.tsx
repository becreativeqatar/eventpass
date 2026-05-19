'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';

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

export default function ArchiveReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [companyData, setCompanyData] = useState<CompanyReport[]>([]);
  const [scanData, setScanData] = useState<ScanActivityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [companyRes, scanRes] = await Promise.all([
          fetch(`/api/reports?type=by-company&projectId=${projectId}`),
          fetch(`/api/reports?type=scan-activity&projectId=${projectId}`),
        ]);
        const company = await companyRes.json();
        const scan = await scanRes.json();
        setCompanyData(company.data || []);
        setScanData(scan.data || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics for this archived event</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accreditations by Company</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.company}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right text-success">{row.APPROVED || 0}</TableCell>
                  <TableCell className="text-right text-destructive">{row.REJECTED || 0}</TableCell>
                </TableRow>
              ))}
              {companyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Allowed</TableHead>
                <TableHead className="text-right">Denied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right text-success">{row.ALLOWED || 0}</TableCell>
                  <TableCell className="text-right text-destructive">{row.DENIED || 0}</TableCell>
                </TableRow>
              ))}
              {scanData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No scan data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
