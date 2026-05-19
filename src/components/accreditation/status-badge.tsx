'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Ban, TimerOff } from 'lucide-react';

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof Clock;
}> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default', icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  REVOKED: { label: 'Revoked', variant: 'destructive', icon: Ban },
  EXPIRED: { label: 'Expired', variant: 'outline', icon: TimerOff },
};

interface StatusBadgeProps {
  status: string;
}

export function AccreditationStatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
