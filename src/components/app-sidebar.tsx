'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  ScanLine,
  BarChart3,
  QrCode,
  ChevronsLeft,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { UserNav } from '@/components/user-nav';
import { EventSwitcher } from '@/components/event-switcher';

const NAV_GROUPS = [
  {
    label: 'Overview',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VALIDATOR'] as string[],
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Event',
    roles: ['ADMIN', 'MANAGER', 'STAFF'] as string[],
    items: [
      { href: '/admin/records', label: 'Records', icon: FileText },
      { href: '/admin/scans', label: 'Scan History', icon: ScanLine },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Scanner',
    roles: ['VALIDATOR'] as string[],
    items: [
      { href: '/validator', label: 'QR Scanner', icon: QrCode },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toggleSidebar, open } = useSidebar();
  const userRole = (session?.user?.role as string) || 'STAFF';

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Image
            src="/images/bce-logo-negative.webp"
            alt="BCE"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="text-base text-sidebar-foreground group-data-[collapsible=icon]:hidden">EventPass</span>
        </Link>
        <EventSwitcher />
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent>
        {NAV_GROUPS.filter((group) => group.roles.includes(userRole)).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, 'exact' in item ? item.exact : false)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="absolute -right-3 top-4 z-20 hidden h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent md:flex"
      >
        <ChevronsLeft className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </Sidebar>
  );
}
