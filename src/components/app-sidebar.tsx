'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Upload,
  ScanLine,
  BarChart3,
  Users,
  Settings,
  QrCode,
  Archive,
  CalendarDays,
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
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { useActiveProject } from '@/hooks/use-active-project';

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
      { href: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
      { href: '/admin/import', label: 'Bulk Import', icon: Upload },
    ],
  },
  {
    label: 'Monitoring',
    roles: ['ADMIN', 'MANAGER', 'STAFF'] as string[],
    items: [
      { href: '/admin/scans', label: 'Scan History', icon: ScanLine },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Archive',
    roles: ['ADMIN', 'MANAGER', 'STAFF'] as string[],
    items: [
      { href: '/admin/archive', label: 'Past Events', icon: Archive },
    ],
  },
  {
    label: 'System',
    roles: ['ADMIN'] as string[],
    items: [
      { href: '/admin/events', label: 'Event Management', icon: CalendarDays },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { project: activeProject } = useActiveProject();
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
        {activeProject && (
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-success/20 text-success border-success/30">
                ACTIVE
              </Badge>
              <span className="text-xs font-medium truncate text-sidebar-foreground">{activeProject.name}</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <div className="px-4 pb-2 group-data-[collapsible=icon]:hidden">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm hover:bg-sidebar-accent/80 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left text-xs">Search...</span>
          <kbd className="text-[10px] bg-sidebar-border/50 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
        </button>
      </div>

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

        {/* QR Scanner — always visible */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/validator')}
                tooltip="QR Scanner"
              >
                <Link href="/validator">
                  <QrCode className="h-4 w-4" />
                  <span>QR Scanner</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="bg-sidebar-border" />
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
