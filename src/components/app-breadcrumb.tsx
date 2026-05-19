'use client';

import { usePathname } from 'next/navigation';
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
  settings: 'Settings',
  scans: 'Scan History',
  import: 'Bulk Import',
  new: 'New',
  edit: 'Edit',
  records: 'Records',
  events: 'Events',
  archive: 'Archive',
  validator: 'Scanner',
  verify: 'Verify',
};

function getLabel(segment: string): string {
  return LABEL_MAP[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumb on dashboard root
  if (segments.length <= 1 && segments[0] === 'admin') {
    return null;
  }

  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = getLabel(segment);
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
