'use client';

import { useEventContext } from '@/contexts/event-context';

/** @deprecated Use useEventContext() from @/contexts/event-context instead */
export function useActiveProject() {
  const { selectedProject, isLoading } = useEventContext();
  return {
    project: selectedProject,
    isLoading,
    error: null,
    refetch: async () => {},
  };
}
