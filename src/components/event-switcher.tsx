'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Check, ChevronsUpDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useEventContext, type EventSummary } from '@/contexts/event-context';

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  COMPLETED: 'bg-primary',
  ARCHIVED: 'bg-muted-foreground',
  DRAFT: 'bg-muted-foreground/50',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-success/20 text-success',
  COMPLETED: 'bg-primary/10 text-primary',
  ARCHIVED: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-secondary text-secondary-foreground',
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
  const [open, setOpen] = useState(false);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-1.5 text-left text-sm hover:bg-sidebar-accent/50 transition-colors"
          >
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[selectedProject.status] || 'bg-muted-foreground')}
            />
            <span className="flex-1 truncate text-sidebar-foreground font-medium text-xs">
              {selectedProject.name}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" side="right" sideOffset={8}>
          <Command>
            <CommandInput placeholder="Search events..." />
            <CommandList>
              <CommandEmpty>No events found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.events.map((event) => (
                    <CommandItem
                      key={event.id}
                      value={`${event.name} ${event.code}`}
                      onSelect={() => {
                        selectEvent(event.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          selectedProject.id === event.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{event.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.code}</span>
                          <span>&middot;</span>
                          <span>{event._count.accreditations} records</span>
                        </div>
                      </div>
                      <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_BADGE[event.status] || '')}>
                        {event.status}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            {isAdmin && (
              <>
                <CommandSeparator />
                <div className="p-1">
                  <Link
                    href="/admin/events"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage Events
                  </Link>
                </div>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
