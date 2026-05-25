'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ConfirmDialog } from '@/components/confirm-dialog';

interface PendingItem {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  role: string | null;
}

interface PendingApprovalsProps {
  items: PendingItem[];
  totalCount: number;
}

export function PendingApprovals({ items: initialItems, totalCount }: PendingApprovalsProps) {
  const [items, setItems] = useState(initialItems);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);
  const [approveAllOpen, setApproveAllOpen] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const handleApprove = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/accreditations/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }
      toast.success('Approved successfully');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/accreditations/${rejectTarget.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }
      toast.success('Rejected successfully');
      setItems((prev) => prev.filter((item) => item.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleApproveAll = async () => {
    setApproveAllOpen(false);
    setApprovingAll(true);
    try {
      const results = await Promise.allSettled(
        items.map((item) =>
          fetch(`/api/accreditations/${item.id}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled' && (r.value as Response).ok).length;
      if (succeeded > 0) {
        toast.success(`Approved ${succeeded} record${succeeded > 1 ? 's' : ''}`);
        setItems([]);
      }
      if (succeeded < results.length) {
        toast.error(`${results.length - succeeded} failed to approve`);
      }
    } catch {
      toast.error('Failed to approve all');
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-base">Pending Approvals</h2>
            {totalCount > 0 && (
              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">{totalCount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={() => setApproveAllOpen(true)}
                disabled={approvingAll}
                className="bce-gradient text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {approvingAll ? 'Approving...' : 'Approve All'}
              </button>
            )}
            <Link href="/admin/records?status=PENDING" className="text-xs text-primary font-medium hover:underline">
              View All
            </Link>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No pending approvals
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map((item) => {
              const isProcessing = processingIds.has(item.id);
              return (
                <div key={item.id} className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-sm">{item.firstName} {item.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.company, item.role].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/admin/records/${item.id}`}
                      className="flex-1 text-center py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={isProcessing}
                      className="flex-1 text-center py-1.5 rounded-md border border-success/30 text-success text-xs font-medium hover:bg-success/10 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(item)}
                      disabled={isProcessing}
                      className="flex-1 text-center py-1.5 rounded-md border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
            {totalCount > items.length && (
              <Link href="/admin/records?status=PENDING" className="block text-center text-xs text-primary font-medium py-2 hover:underline">
                View all {totalCount} pending
              </Link>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Accreditation</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{' '}
              <span className="font-medium">{rejectTarget?.firstName} {rejectTarget?.lastName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dashboard-reject-reason">Reason for rejection *</Label>
            <Textarea
              id="dashboard-reject-reason"
              placeholder="Enter the reason for rejecting this accreditation..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectTarget(null); setRejectReason(''); }}
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

      <ConfirmDialog
        open={approveAllOpen}
        onOpenChange={setApproveAllOpen}
        title="Approve All Pending"
        description={`Are you sure you want to approve all ${items.length} pending accreditation${items.length !== 1 ? 's' : ''}?`}
        confirmLabel="Approve All"
        onConfirm={handleApproveAll}
      />
    </>
  );
}
