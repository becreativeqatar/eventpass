'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppBreadcrumb } from '@/components/app-breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { CommandSearch } from '@/components/command-search';
import { EventProvider } from '@/contexts/event-context';
import { ReadOnlyBanner } from '@/components/read-only-banner';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const showBreadcrumb = pathname !== '/admin';

  if (status === 'loading') {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-6">
            <Skeleton className="h-4 w-48" />
          </header>
          <main className="flex-1 p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please sign in</h2>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {showBreadcrumb && (
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-6">
            <AppBreadcrumb />
          </header>
        )}
        <ReadOnlyBanner />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EventProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
        <CommandSearch />
      </EventProvider>
    </SessionProvider>
  );
}
