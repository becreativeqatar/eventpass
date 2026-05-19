'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Download, Upload, Eye, QrCode, Users, CheckCircle, FileText, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

interface Accreditation {
  id: string;
  accreditationNumber: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  accessGroup: string;
  photoUrl: string | null;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ProjectRecordsClientProps {
  projectId: string;
}

export default function ProjectRecordsClient({ projectId }: ProjectRecordsClientProps) {
  const searchParams = useSearchParams();
  const [accreditations, setAccreditations] = useState<Accreditation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [filters, setFilters] = useState({
    status: 'APPROVED',
    accessGroup: 'all',
    q: '',
  });

  useEffect(() => {
    try {
      const statusParam = searchParams?.get('status');
      if (statusParam) {
        setFilters((prev) => ({ ...prev, status: statusParam }));
      }
    } catch (error) {
      console.error('Error reading search params:', error);
    }
  }, [searchParams]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<{ action: 'approve' | 'reject' | 'delete' } | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (!projectId) return;

    const timer = setTimeout(() => {
      fetchAccreditations();
      fetchStats();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, projectId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/accreditation/projects/${projectId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.totalAccreditations || 0,
          draft: data.draftAccreditations || 0,
          pending: data.pendingAccreditations || 0,
          approved: data.approvedAccreditations || 0,
          rejected: data.rejectedAccreditations || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAccreditations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        p: pagination.page.toString(),
        ps: pagination.pageSize.toString(),
        projectId: projectId,
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.accessGroup && filters.accessGroup !== 'all' && { accessGroup: filters.accessGroup }),
        ...(filters.q && { q: filters.q }),
      });

      const response = await fetch(`/api/accreditations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccreditations(data.accreditations || data.data || []);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching accreditations:', error);
      toast.error('Failed to load accreditations');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.status, filters.q, pagination.page]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === accreditations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accreditations.map((a) => a.id)));
    }
  };

  const selectedStatuses = accreditations
    .filter((a) => selectedIds.has(a.id))
    .map((a) => a.status);
  const hasPending = selectedStatuses.some((s) => s === 'PENDING');
  const hasDraft = selectedStatuses.some((s) => s === 'DRAFT');

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    try {
      const res = await fetch('/api/accreditations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.affected} record${data.affected !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : action + 'd'}`);
      setSelectedIds(new Set());
      fetchAccreditations();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed');
    }
    setBulkConfirm(null);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-700 border-green-300',
      REJECTED: 'bg-red-100 text-red-700 border-red-300',
    };

    return (
      <Badge className={styles[status as keyof typeof styles] || styles.DRAFT} variant="outline">
        {status}
      </Badge>
    );
  };

  const exportToCSV = async () => {
    const csv = [
      ['Accreditation Number', 'First Name', 'Last Name', 'Company', 'Role', 'Access Group', 'Status'].join(','),
      ...accreditations.map((acc) =>
        [acc.accreditationNumber, acc.firstName, acc.lastName, acc.company, acc.role, acc.accessGroup, acc.status].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `accreditations-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${accreditations.length} record${accreditations.length !== 1 ? 's' : ''}`);
  };

  const exportQRCodes = async () => {
    try {
      toast.loading('Generating QR codes...', { id: 'export-qr' });

      const params = new URLSearchParams({
        projectId: projectId,
        ...(filters.accessGroup && filters.accessGroup !== 'all' && { accessGroup: filters.accessGroup }),
      });

      const response = await fetch(`/api/qr/batch-export?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export QR codes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('QR codes exported successfully', { id: 'export-qr' });
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export QR codes', { id: 'export-qr' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, company, or accreditation number..."
            className="pl-10"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={exportToCSV} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={exportQRCodes} title="Export QR Codes">
          <QrCode className="h-4 w-4" />
        </Button>

        <Link href="/admin/import">
          <Button variant="outline" size="icon" title="Import CSV">
            <Upload className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={accreditations.length > 0 && selectedIds.size === accreditations.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Photo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Access Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-10 w-10 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))
              ) : accreditations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12">
                    <EmptyState
                      icon={FileText}
                      title={filters.status !== 'all' ? `No ${filters.status.toLowerCase()} records found` : "No records found"}
                      description={filters.status !== 'all' ? "Try changing the status filter or create a new record" : "Get started by creating a new accreditation record"}
                      action={
                        <Link href="/admin/records/new">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Record
                          </Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                accreditations.map((acc) => (
                  <tr key={acc.id} className="hover:bg-muted/50">
                    <td className="px-3 py-4">
                      <Checkbox
                        checked={selectedIds.has(acc.id)}
                        onCheckedChange={() => toggleSelect(acc.id)}
                        aria-label={`Select ${acc.firstName} ${acc.lastName}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-10 w-10 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                        {acc.photoUrl ? (
                          <Image
                            src={acc.photoUrl}
                            alt={`${acc.firstName} ${acc.lastName}`}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground font-medium text-sm">
                            {acc.firstName?.[0] || ''}{acc.lastName?.[0] || ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-foreground">{acc.accreditationNumber}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {acc.firstName} {acc.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground">{acc.company}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-muted-foreground">{acc.role}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="text-xs">
                        {acc.accessGroup}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(acc.status)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/admin/records/${acc.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <BulkActionBar
        selectedCount={selectedIds.size}
        hasPending={hasPending}
        hasDraft={hasDraft}
        onApprove={() => setBulkConfirm({ action: 'approve' })}
        onReject={() => setBulkConfirm({ action: 'reject' })}
        onDelete={() => setBulkConfirm({ action: 'delete' })}
        onClear={() => setSelectedIds(new Set())}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}
        title={`Bulk ${bulkConfirm?.action || ''}`}
        description={`Are you sure you want to ${bulkConfirm?.action} ${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel={bulkConfirm?.action === 'delete' ? 'Delete' : bulkConfirm?.action === 'approve' ? 'Approve' : 'Reject'}
        variant={bulkConfirm?.action === 'approve' ? 'default' : 'destructive'}
        onConfirm={() => { if (bulkConfirm) handleBulkAction(bulkConfirm.action); }}
      />
    </div>
  );
}
