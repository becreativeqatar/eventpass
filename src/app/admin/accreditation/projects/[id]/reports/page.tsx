'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Users, CheckCircle2, XCircle, Clock, BarChart3, Activity } from 'lucide-react';
import { ScanHistory } from '@/components/accreditation/scan-history';
import { toast } from 'sonner';

interface ProjectReportData {
  project: {
    id: string;
    name: string;
    code: string;
    bumpInStart: string;
    bumpInEnd: string;
    liveStart: string;
    liveEnd: string;
    bumpOutStart: string;
    bumpOutEnd: string;
    accessGroups: string[];
  };
  stats: {
    total: number;
    byStatus: {
      PENDING: number;
      APPROVED: number;
      REJECTED: number;
      REVOKED: number;
    };
    byAccessGroup: Record<string, number>;
    byPhaseAccess: {
      bumpIn: number;
      live: number;
      bumpOut: number;
    };
    recentScans: {
      total: number;
      today: number;
      thisWeek: number;
    };
  };
}

export default function ProjectReportsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [reportData, setReportData] = useState<ProjectReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [projectId]);

  const fetchReportData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/accreditation/projects/${projectId}`);
      const statsRes = await fetch(`/api/accreditation/projects/${projectId}/stats`);

      if (projectRes.ok && statsRes.ok) {
        const projectData = await projectRes.json();
        const statsData = await statsRes.json();

        setReportData({
          project: projectData.project,
          stats: {
            total: statsData.totalAccreditations || 0,
            byStatus: {
              PENDING: statsData.pendingAccreditations || 0,
              APPROVED: statsData.approvedAccreditations || 0,
              REJECTED: statsData.rejectedAccreditations || 0,
              REVOKED: 0,
            },
            byAccessGroup: {},
            byPhaseAccess: {
              bumpIn: 0,
              live: 0,
              bumpOut: 0,
            },
            recentScans: {
              total: statsData.totalScans || 0,
              today: 0,
              thisWeek: 0,
            },
          },
        });
      } else {
        toast.error('Failed to load report data');
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    toast.info('CSV export coming soon');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading report data...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No report data available</p>
      </div>
    );
  }

  const { project, stats } = reportData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">Project Code: {project.code}</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-semibold text-blue-900 mb-1">Bump-In Phase</p>
              <p className="text-blue-700">{formatDate(project.bumpInStart)} - {formatDate(project.bumpInEnd)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-900 mb-1">Live Phase</p>
              <p className="text-green-700">{formatDate(project.liveStart)} - {formatDate(project.liveEnd)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="font-semibold text-purple-900 mb-1">Bump-Out Phase</p>
              <p className="text-purple-700">{formatDate(project.bumpOutStart)} - {formatDate(project.bumpOutEnd)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Accreditations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold">{stats.byStatus.APPROVED}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <span className="text-3xl font-bold">{stats.byStatus.PENDING}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <span className="text-3xl font-bold">{stats.byStatus.REJECTED}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="bg-white shadow-sm border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Pending Review</span>
                <span className="text-sm text-muted-foreground">{stats.byStatus.PENDING}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.byStatus.PENDING / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Approved</span>
                <span className="text-sm text-muted-foreground">{stats.byStatus.APPROVED}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.byStatus.APPROVED / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Rejected</span>
                <span className="text-sm text-muted-foreground">{stats.byStatus.REJECTED}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${stats.total > 0 ? (stats.byStatus.REJECTED / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Activity */}
      <Card className="bg-white shadow-sm border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Scan Activity
          </CardTitle>
          <CardDescription>Badge scan statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">Total Scans</span>
            <Badge variant="outline">{stats.recentScans.total}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scan History */}
      <ScanHistory
        projectId={project.id}
        title="Event Scan History"
      />
    </div>
  );
}
