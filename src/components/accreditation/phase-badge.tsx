'use client';

import { Badge } from '@/components/ui/badge';
import { HardHat, Radio, PackageOpen } from 'lucide-react';
import type { AccreditationPhase } from '@/lib/validations/accreditation';

const phaseConfig: Record<string, { label: string; color: string; icon: typeof HardHat }> = {
  BUMP_IN: { label: 'Bump-In', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: HardHat },
  LIVE: { label: 'Live', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: Radio },
  BUMP_OUT: { label: 'Bump-Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: PackageOpen },
};

interface PhaseBadgeProps {
  phase: AccreditationPhase;
  size?: 'sm' | 'default';
}

export function PhaseBadge({ phase, size = 'default' }: PhaseBadgeProps) {
  const config = phaseConfig[phase] || { label: phase, color: 'bg-muted text-muted-foreground', icon: Radio };
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${config.color} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

interface PhaseBadgesProps {
  phases: AccreditationPhase[];
}

export function PhaseBadges({ phases }: PhaseBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {phases.map((phase) => (
        <PhaseBadge key={phase} phase={phase} />
      ))}
    </div>
  );
}
