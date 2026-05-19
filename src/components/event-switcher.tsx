'use client';

import { useSession } from 'next-auth/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useEventContext, type EventSummary } from '@/contexts/event-context';

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  COMPLETED: 'bg-primary',
  ARCHIVED: 'bg-muted-foreground',
  DRAFT: 'bg-muted-foreground/50',
};

function groupEvents(events: EventSummary[], isAdmin: boolean) {
  const groups: { label: string; events: EventSummary[] }[] = [];

  const active = events.filter((e) => e.status === 'ACTIVE');
  const completed = events.filter((e) => e.status === 'COMPLETED');
  const archived = events.filter((e) => e.status === 'ARCHIVED');
  const drafts = events.filter((e) => e.status === 'DRAFT');

  if (active.length) groups.push({ label: 'Active', events: active });
  if (completed.length) groups.push({ label: 'Completed', events: completed });
  if (archived.length) groups.push({ label: 'Archived', events: archived });
  if (isAdmin && drafts.length) groups.push({ label: 'Drafts', events: drafts });

  return groups;
}

export function EventSwitcher() {
  const { data: session } = useSession();
  const { selectedProject, events, isLoading, selectEvent } = useEventContext();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

  if (isLoading || !selectedProject) {
    return (
      <div className="mt-2 group-data-[collapsible=icon]:hidden">
        <div className="h-8 w-full animate-pulse rounded-md bg-sidebar-accent/50" />
      </div>
    );
  }

  const groups = groupEvents(events, isAdmin);

  return (
    <div className="mt-2 group-data-[collapsible=icon]:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent w-full"
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[selectedProject.status] || 'bg-muted-foreground')}
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-sidebar-foreground">
                {selectedProject.name}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {selectedProject.code}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 text-sidebar-foreground/50" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-56"
        >
          {groups.map((group, i) => (
            <div key={group.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
              <DropdownMenuGroup>
                {group.events.map((event) => (
                  <DropdownMenuItem
                    key={event.id}
                    onClick={() => selectEvent(event.id)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[event.status] || 'bg-muted-foreground')}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate text-sm">{event.name}</span>
                    </div>
                    {selectedProject.id === event.id && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
