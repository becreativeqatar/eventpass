'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

const LABEL_MAP: Record<string, string> = {
  admin: 'Dashboard',
  approvals: 'Approvals',
  reports: 'Reports',
  users: 'Users',
  scans: 'Scan History',
  import: 'Bulk Import',
  new: 'New',
  edit: 'Edit',
  records: 'Records',
  events: 'Events',
  accreditation: 'Accreditation',
  projects: 'Projects',
  validator: 'Scanner',
  verify: 'Verify',
};

// Detect dynamic ID segments (cuid, uuid, or numeric IDs)
function isDynamicId(segment: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment) || /^\d+$/.test(segment);
}

function getLabel(segment: string): string {
  return LABEL_MAP[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  // Resolve dynamic IDs to human-readable names
  useEffect(() => {
    // Map: parent segment -> { apiPath, labelExtractor }
    const resolvers: Record<string, { getUrl: (id: string) => string; getLabel: (data: Record<string, unknown>) => string }> = {
      events: {
        getUrl: (id) => `/api/events/${id}`,
        getLabel: (data) => (data.data as { name: string })?.name,
      },
      projects: {
        getUrl: (id) => `/api/accreditation/projects/${id}`,
        getLabel: (data) => (data.data as { name: string })?.name,
      },
      records: {
        getUrl: (id) => `/api/accreditations/${id}`,
        getLabel: (data) => {
          const acc = data.data as { firstName?: string; lastName?: string; accreditationNumber?: string };
          if (acc?.firstName && acc?.lastName) return `${acc.firstName} ${acc.lastName}`;
          if (acc?.accreditationNumber) return `#${acc.accreditationNumber}`;
          return '';
        },
      },
    };

    const pending: Promise<void>[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];
      if (nextSegment && isDynamicId(nextSegment) && resolvers[segment] && !dynamicLabels[nextSegment]) {
        const resolver = resolvers[segment];
        pending.push(
          fetch(resolver.getUrl(nextSegment))
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
              if (data) {
                const label = resolver.getLabel(data);
                if (label) {
                  setDynamicLabels((prev) => ({ ...prev, [nextSegment]: label }));
                }
              }
            })
            .catch(() => {})
        );
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't show breadcrumb on dashboard root
  if (segments.length <= 1 && segments[0] === 'admin') {
    return null;
  }

  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = dynamicLabels[segment] || getLabel(segment);
    const isLast = index === segments.length - 1;
    // Skip rendering 'admin' as a separate breadcrumb — it's the home
    if (index === 0 && segment === 'admin') {
      return null;
    }
    return { href, label, isLast, segment };
  }).filter(Boolean);

  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item) => (
          <Fragment key={item!.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item!.isLast ? (
                <BreadcrumbPage>{item!.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item!.href}>{item!.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
