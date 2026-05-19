export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getSelectedProject } from '@/lib/active-project';
import { redirect } from 'next/navigation';
import ProjectRecordsClient from './client';

export default async function RecordsPage() {
  const project = await getSelectedProject();

  if (!project) {
    redirect('/admin');
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-muted-foreground">Loading records...</div>}>
        <ProjectRecordsClient projectId={project.id} />
      </Suspense>
    </div>
  );
}
