'use client';

import { useEventContext } from '@/contexts/event-context';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

export function ReadOnlyBanner() {
  const { selectedProject, isReadOnly } = useEventContext();
  if (!isReadOnly || !selectedProject) return null;

  return (
    <div className="bg-muted/50 border-b px-6 py-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Eye className="h-3.5 w-3.5" />
      <span>Viewing:</span>
      <span className="font-medium text-foreground">{selectedProject.name}</span>
      <Badge variant="outline" className="text-[10px] ml-1">
        {selectedProject.status}
      </Badge>
      <span className="ml-auto text-xs">Read-only</span>
    </div>
  );
}
