'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/data-table';
import { AccreditationStatusBadge } from './status-badge';
import { PhaseBadge } from './phase-badge';
import { IdCard } from 'lucide-react';
import type { AccreditationPhase } from '@/lib/validations/accreditation';

interface Accreditation {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  accessGroup?: string | null;
  status: string;
  phases: string[];
  createdAt: string;
}

interface AccreditationListTableProps {
  projectId: string;
  accreditations: Accreditation[];
}

export function AccreditationListTable({ projectId, accreditations }: AccreditationListTableProps) {
  const columns: Column<Accreditation>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (acc) => (
        <div>
          <div className="font-medium">{acc.firstName} {acc.lastName}</div>
          {acc.email && <div className="text-sm text-muted-foreground">{acc.email}</div>}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (acc) => acc.company || '-',
    },
    {
      key: 'role',
      header: 'Role',
      render: (acc) => acc.role || '-',
      mobileRender: false,
    },
    {
      key: 'accessGroup',
      header: 'Access Group',
      render: (acc) => acc.accessGroup ? <Badge variant="outline">{acc.accessGroup}</Badge> : '-',
      mobileRender: false,
    },
    {
      key: 'status',
      header: 'Status',
      render: (acc) => <AccreditationStatusBadge status={acc.status} />,
    },
    {
      key: 'phases',
      header: 'Phases',
      render: (acc) => (
        <div className="flex gap-1 flex-wrap">
          {acc.phases.map((phase) => (
            <PhaseBadge key={phase} phase={phase as AccreditationPhase} size="sm" />
          ))}
        </div>
      ),
      mobileRender: false,
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (acc) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/admin/records/${acc.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link href={`/admin/records/${projectId}/records/${acc.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      ),
      mobileRender: (acc) => (
        <div className="flex gap-2">
          <Link href={`/admin/records/${acc.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">View</Button>
          </Link>
          <Link href={`/admin/records/${projectId}/records/${acc.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">Edit</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={accreditations}
      keyExtractor={(acc) => acc.id}
      emptyIcon={IdCard}
      emptyTitle="No accreditations found"
      emptyDescription="Add your first accreditation to this project."
      emptyAction={
        <Link href={`/admin/records/new`}>
          <Button>Add First Accreditation</Button>
        </Link>
      }
    />
  );
}
