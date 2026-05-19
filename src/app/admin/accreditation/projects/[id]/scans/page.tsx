'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Activity, CheckCircle, XCircle } from 'lucide-react';
import { ScanHistory } from '@/components/accreditation/scan-history';
import { toast } from 'sonner';

interface ScanStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  todayScans: number;
}

export default function ProjectScansPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [stats, setStats] = useState<ScanStats>({
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    todayScans: 0,
  });
  const [validityFilter, setValidityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/accreditation/projects/${projectId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalScans: data.totalScans || 0,
          validScans: data.validScans || 0,
          invalidScans: data.invalidScans || 0,
          todayScans: data.todayScans || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching scan stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportScans = async () => {
    try {
      toast.loading('Exporting scans...', { id: 'export-scans' });

      const params = new URLSearchParams({
        projectId: projectId,
        ...(validityFilter !== 'all' && { valid: validityFilter }),
      });

      const response = await fetch(`/api/scans/export?${params}`);

      if (!response.ok) {
        throw new Error('Failed to export scans');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scans-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Scans exported successfully', { id: 'export-scans' });
    } catch (error) {
      console.error('Error exporting scans:', error);
      toast.error('Failed to export scans', { id: 'export-scans' });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading scan data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Scan Logs</h2>
          <p className="text-muted-foreground mt-1">
            View and analyze QR code scan activity
          </p>
        </div>
        <Button onClick={exportScans}>
          <Download className="h-4 w-4 mr-2" />
          Export Scans
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalScans}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Valid Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.validScans}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Invalid Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.invalidScans}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.todayScans}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={validityFilter} onValueChange={setValidityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by validity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scans</SelectItem>
                <SelectItem value="true">Valid Only</SelectItem>
                <SelectItem value="false">Invalid Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scan History */}
      <ScanHistory
        projectId={projectId}
        title="Project Scan History"
      />
    </div>
  );
}
