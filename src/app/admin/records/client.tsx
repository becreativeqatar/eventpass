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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
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
    status: searchParams.get('status') || 'all',
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
  const [bulkConfirm, setBulkConfirm] = useState<{ action: 'approve' | 'delete' } | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

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

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete', reason?: string) => {
    try {
      const res = await fetch('/api/accreditations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedIds), ...(reason && { reason }) }),
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

  const handleQuickApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/accreditations/${id}/approve`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }
      toast.success('Record approved');
      fetchAccreditations();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/accreditations/${rejectDialog.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }
      toast.success('Record rejected');
      setRejectDialog(null);
      setRejectReason('');
      fetchAccreditations();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setRejectLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-muted text-foreground border-border',
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or number..."
              className="pl-10"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-full sm:w-40">
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
        </div>

        <div className="flex items-center gap-2">
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

          <div className="flex-1" />

          <Link href="/admin/records/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Record</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Table - Desktop */}
      <Card>
        <div className="hidden md:block overflow-x-auto">
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
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
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
                  <td colSpan={8} className="px-6 py-12">
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
                      <div className="flex items-center justify-end gap-1">
                        {acc.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleQuickApprove(acc.id)} title="Approve">
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setRejectDialog({ id: acc.id, name: `${acc.firstName} ${acc.lastName}` })} title="Reject">
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        <Link href={`/admin/records/${acc.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : accreditations.length === 0 ? (
            <div className="px-6 py-12">
              <EmptyState
                icon={FileText}
                title={filters.status !== 'all' ? `No ${filters.status.toLowerCase()} records found` : "No records found"}
                description={filters.status !== 'all' ? "Try changing the status filter or create a new record" : "Get started by creating a new accreditation record"}
                action={
                  <Link href="/admin/records/new">
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Record
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            accreditations.map((acc) => (
              <div key={acc.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(acc.id)}
                      onCheckedChange={() => toggleSelect(acc.id)}
                      aria-label={`Select ${acc.firstName} ${acc.lastName}`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{acc.firstName} {acc.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{acc.company} {acc.role ? `· ${acc.role}` : ''}</p>
                    </div>
                  </div>
                  {getStatusBadge(acc.status)}
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-xs font-mono text-muted-foreground">{acc.accreditationNumber}</span>
                  <Badge variant="outline" className="text-xs">{acc.accessGroup}</Badge>
                </div>
                <div className="flex gap-2 pl-7">
                  {acc.status === 'PENDING' && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => handleQuickApprove(acc.id)}>
                        <CheckCircle className="h-4 w-4 mr-1.5 text-success" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setRejectDialog({ id: acc.id, name: `${acc.firstName} ${acc.lastName}` })}>
                        <XCircle className="h-4 w-4 mr-1.5 text-destructive" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Link href={`/admin/records/${acc.id}`} className={acc.status === 'PENDING' ? '' : 'flex-1'}>
                    <Button variant="outline" size="sm" className="w-full h-9">
                      <Eye className="h-4 w-4 mr-1.5" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                <span className="hidden sm:inline">Showing </span>{(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
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
        onReject={() => setBulkRejectOpen(true)}
        onDelete={() => setBulkConfirm({ action: 'delete' })}
        onClear={() => setSelectedIds(new Set())}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}
        title={`Bulk ${bulkConfirm?.action || ''}`}
        description={`Are you sure you want to ${bulkConfirm?.action} ${selectedIds.size} record${selectedIds.size !== 1 ? 's' : ''}?`}
        confirmLabel={bulkConfirm?.action === 'delete' ? 'Delete' : 'Approve'}
        variant={bulkConfirm?.action === 'approve' ? 'default' : 'destructive'}
        onConfirm={() => { if (bulkConfirm) handleBulkAction(bulkConfirm.action); }}
      />

      <Dialog
        open={bulkRejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkRejectOpen(false);
            setBulkRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-reject-reason">Reason for rejection *</Label>
            <Textarea
              id="bulk-reject-reason"
              placeholder="Enter the reason for rejecting these accreditations..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBulkRejectOpen(false); setBulkRejectReason(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleBulkAction('reject', bulkRejectReason);
                setBulkRejectOpen(false);
                setBulkRejectReason('');
              }}
              disabled={!bulkRejectReason.trim()}
            >
              Reject {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Accreditation</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{' '}
              <span className="font-medium">{rejectDialog?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason for rejection *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter the reason for rejecting this accreditation..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectDialog(null); setRejectReason(''); }}
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectLoading || !rejectReason.trim()}
            >
              {rejectLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
