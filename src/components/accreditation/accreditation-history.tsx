'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatQatarDateTime } from '@/lib/date';

interface HistoryEntry {
  id: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  performedAt: string;
  performedBy: { name: string | null; email: string };
}

interface AccreditationHistoryProps {
  accreditationId: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  REINSTATED: 'bg-green-100 text-green-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  UPDATED: 'bg-muted text-foreground',
};

export function AccreditationHistory({ accreditationId }: AccreditationHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/accreditations/${accreditationId}/history`);
        const data = await res.json();
        setHistory(data.data || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [accreditationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No history recorded
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 border-l-2 border-muted pl-4 pb-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={ACTION_COLORS[entry.action] || 'bg-muted'}>
                      {entry.action}
                    </Badge>
                    {entry.oldStatus && entry.newStatus && (
                      <span className="text-sm text-muted-foreground">
                        {entry.oldStatus} → {entry.newStatus}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    by {entry.performedBy.name || entry.performedBy.email} on{' '}
                    {formatQatarDateTime(entry.performedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
