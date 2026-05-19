'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RevokeDialogProps {
  accreditationId: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevokeDialog({
  accreditationId,
  personName,
  open,
  onOpenChange,
  onSuccess,
}: RevokeDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for revoking');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/accreditations/${accreditationId}/revoke`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke accreditation');
      }

      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Accreditation</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke the accreditation for{' '}
            <span className="font-medium">{personName}</span>? This action can be undone
            by reinstating the accreditation later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for revocation *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for revoking this accreditation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Revoking...' : 'Revoke Accreditation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
