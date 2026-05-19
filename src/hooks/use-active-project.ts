'use client';

import { useState, useEffect, useCallback } from 'react';

interface ActiveProject {
  id: string;
  name: string;
  code: string;
  status: string;
  venue: string | null;
  eventDate: string | null;
  accessGroups: string[];
  bumpInStart: string | null;
  bumpInEnd: string | null;
  liveStart: string | null;
  liveEnd: string | null;
  bumpOutStart: string | null;
  bumpOutEnd: string | null;
}

export function useActiveProject() {
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/active-project');
      if (res.ok) {
        const data = await res.json();
        setProject(data.project || null);
        setError(null);
      } else {
        setProject(null);
        setError('Failed to fetch active project');
      }
    } catch {
      setProject(null);
      setError('Failed to fetch active project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, isLoading, error, refetch: fetchProject };
}
