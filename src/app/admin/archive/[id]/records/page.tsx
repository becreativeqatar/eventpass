export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProjectRecordsClient from '@/app/admin/records/client';

export default async function ArchiveRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.accreditationProject.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Archive: {project.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">Records</h1>
      </div>
      <Suspense fallback={<div className="p-8 text-muted-foreground">Loading records...</div>}>
        <ProjectRecordsClient projectId={id} />
      </Suspense>
    </div>
  );
}
