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

interface ReinstateDialogProps {
  accreditationId: string;
  personName: string;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReinstateDialog({
  accreditationId,
  personName,
  currentStatus,
  open,
  onOpenChange,
  onSuccess,
}: ReinstateDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReinstate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/accreditations/${accreditationId}/reinstate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reinstate accreditation');
      }

      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reinstate');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reinstate Accreditation</DialogTitle>
          <DialogDescription>
            Reinstate the accreditation for{' '}
            <span className="font-medium">{personName}</span>? The current status is{' '}
            <span className="font-medium">{currentStatus}</span>. The accreditation will
            be set to APPROVED.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this reinstatement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
          <Button onClick={handleReinstate} disabled={loading}>
            {loading ? 'Reinstating...' : 'Reinstate Accreditation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
