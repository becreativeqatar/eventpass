export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getActiveProject } from '@/lib/active-project';
import { redirect } from 'next/navigation';
import ProjectRecordsClient from './client';

export default async function RecordsPage() {
  const project = await getActiveProject();

  if (!project) {
    redirect('/admin/events');
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-gray-500">Loading records...</div>}>
        <ProjectRecordsClient projectId={project.id} />
      </Suspense>
    </div>
  );
}
