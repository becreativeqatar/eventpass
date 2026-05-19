'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ClipboardCheck, CheckCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useActiveProject } from '@/hooks/use-active-project';
import { toast } from 'sonner';

interface Accreditation {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  role: string | null;
  status: string;
  phases: string;
  createdAt: string;
  project: { id: string; name: string };
  createdBy: { name: string | null; email: string };
}

export default function ApprovalsPage() {
  const { project: activeProject, isLoading: projectLoading } = useActiveProject();
  const [accreditations, setAccreditations] = useState<Accreditation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Accreditation | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);

  const fetchPendingApprovals = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accreditations?status=PENDING&projectId=${activeProject.id}`);
      const data = await res.json();
      setAccreditations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject) fetchPendingApprovals();
  }, [activeProject]);

  const handleAction = async () => {
    if (!selectedItem || !actionType) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/accreditations/${selectedItem.id}/${actionType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setSelectedItem(null);
        setActionType(null);
        setReason('');
        fetchPendingApprovals();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    setShowBulkApproveDialog(false);
    setProcessing(true);
    try {
      for (const acc of accreditations) {
        await fetch(`/api/accreditations/${acc.id}/approve`, { method: 'PATCH' });
      }
      toast.success(`Approved ${accreditations.length} accreditations`);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Bulk approve failed:', error);
      toast.error('Bulk approve failed');
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<Accreditation>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (acc) => (
        <div>
          <Link href={`/admin/records/${acc.id}`} className="font-medium hover:underline">
            {acc.firstName} {acc.lastName}
          </Link>
          {acc.email && <div className="text-sm text-muted-foreground">{acc.email}</div>}
        </div>
      ),
    },
    { key: 'company', header: 'Company', render: (acc) => acc.company || '-', mobileRender: false },
    { key: 'role', header: 'Role', render: (acc) => acc.role || '-', mobileRender: false },
    {
      key: 'phases',
      header: 'Phases',
      render: (acc) => (
        <div className="flex gap-1 flex-wrap">
          {(Array.isArray(acc.phases) ? acc.phases : acc.phases.split(',').filter(Boolean)).map((phase: string) => (
            <Badge key={phase} variant="secondary" className="text-xs">{phase}</Badge>
          ))}
        </div>
      ),
      mobileRender: false,
    },
    { key: 'submitted', header: 'Submitted', render: (acc) => new Date(acc.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (acc) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => { setSelectedItem(acc); setActionType('approve'); }}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => { setSelectedItem(acc); setActionType('reject'); }}>Reject</Button>
        </div>
      ),
      mobileRender: (acc) => (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => { setSelectedItem(acc); setActionType('approve'); }}>Approve</Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSelectedItem(acc); setActionType('reject'); }}>Reject</Button>
        </div>
      ),
    },
  ];

  if (projectLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!activeProject) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold mb-2">No Active Event</h2>
        <p className="text-muted-foreground mb-4">Activate an event to manage approvals.</p>
        <Link href="/admin/events"><Button>Manage Events</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground">Review and approve accreditation requests</p>
        </div>
        {accreditations.length > 0 && (
          <Button onClick={() => setShowBulkApproveDialog(true)} disabled={processing}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All ({accreditations.length})
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={accreditations}
        keyExtractor={(acc) => acc.id}
        loading={loading}
        emptyIcon={ClipboardCheck}
        emptyTitle="No pending approvals"
        emptyDescription="All accreditation requests have been reviewed."
      />

      <Dialog
        open={!!selectedItem && !!actionType}
        onOpenChange={() => { setSelectedItem(null); setActionType(null); setReason(''); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve' : 'Reject'} Accreditation</DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approve accreditation for ${selectedItem?.firstName} ${selectedItem?.lastName}?`
                : `Reject accreditation for ${selectedItem?.firstName} ${selectedItem?.lastName}?`}
            </DialogDescription>
          </DialogHeader>
          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for rejection</Label>
              <Textarea id="reason" placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedItem(null); setActionType(null); setReason(''); }}>Cancel</Button>
            <Button variant={actionType === 'reject' ? 'destructive' : 'default'} onClick={handleAction} disabled={processing}>
              {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showBulkApproveDialog}
        onOpenChange={setShowBulkApproveDialog}
        title="Bulk Approve"
        description={`Approve all ${accreditations.length} pending accreditations? This action cannot be undone.`}
        confirmLabel={`Approve All (${accreditations.length})`}
        onConfirm={handleBulkApprove}
        loading={processing}
      />
    </div>
  );
}
