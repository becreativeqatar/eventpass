'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Scan {
  id: string;
  phase: string;
  result: string;
  scannedAt: string;
  accreditation: {
    firstName: string;
    lastName: string;
    company: string | null;
  };
}

const RESULT_STYLES: Record<string, string> = {
  ALLOWED: 'bg-success/10 text-success',
  DENIED: 'bg-destructive/10 text-destructive',
  REVOKED: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-muted text-muted-foreground',
  WRONG_PHASE: 'bg-warning/10 text-warning',
};

const PHASE_LABELS: Record<string, string> = {
  BUMP_IN: 'Bump In',
  LIVE: 'Live',
  BUMP_OUT: 'Bump Out',
};

export function ScanHistoryList({ userId }: { userId: string }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      try {
        const res = await fetch(`/api/scans?scannedById=${userId}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setScans(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch scan history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchScans();
  }, [userId]);

  if (loading) return null;
  if (scans.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Scans</h3>
      <div className="bg-card rounded-xl border shadow-sm divide-y divide-border">
        {scans.map((scan) => (
          <div key={scan.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {scan.accreditation.firstName} {scan.accreditation.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {scan.accreditation.company || 'N/A'}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${RESULT_STYLES[scan.result] || 'bg-muted text-muted-foreground'}`}>
              {scan.result}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {PHASE_LABELS[scan.phase] || scan.phase}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
