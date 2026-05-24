'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

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

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/accreditations/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }
      toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
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
              onClick={handleApproveAll}
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
                  <button
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={isProcessing}
                    className="flex-1 text-center py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success hover:text-white transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'reject')}
                    disabled={isProcessing}
                    className="flex-1 text-center py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive hover:text-white transition-colors disabled:opacity-50"
                  >
                    Reject
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
  );
}
