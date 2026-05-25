'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  hasPending: boolean;
  hasDraft: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  hasPending,
  hasDraft,
  onApprove,
  onReject,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-card border shadow-xl rounded-xl px-4 py-3 flex items-center gap-2 sm:gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <span className="text-sm font-medium shrink-0">{selectedCount} selected</span>

      <div className="h-4 w-px bg-border shrink-0" />

      {hasPending && (
        <>
          <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={onApprove}>
            <CheckCircle className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Approve</span>
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onReject}>
            <XCircle className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Reject</span>
          </Button>
        </>
      )}

      {hasDraft && (
        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      )}

      <Button size="sm" variant="ghost" onClick={onClear} aria-label="Clear selection">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
