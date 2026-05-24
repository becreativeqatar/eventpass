'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  code: string;
  description: string | null;
  venue: string | null;
  eventDate: string | null;
  status: string;
  createdAt: string;
  _count: { accreditations: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  ACTIVE: 'bg-success/20 text-success',
  COMPLETED: 'bg-primary/10 text-primary',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

const FILTERS = ['All', 'Active', 'Draft', 'Completed', 'Archived'] as const;

export default function EventsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(data.data || []);
      } catch {
        toast.error('Failed to fetch events');
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filter === 'All') return true;
    return e.status === filter.toUpperCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Manage and browse all events</p>
        </div>
        {isAdmin && (
          <Link href="/admin/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </Link>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading events...</div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-4">Create your first event to get started.</p>
            {isAdmin && (
              <Link href="/admin/events/new">
                <Button><Plus className="h-4 w-4 mr-2" />Create Event</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No {filter.toLowerCase()} events found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <Link key={event.id} href={`/admin/events/${(event.code || event.id).toLowerCase()}`}>
              <Card className="transition-colors hover:border-primary/30 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={STATUS_STYLES[event.status] || ''}>{event.status}</Badge>
                      <span className="text-xs text-muted-foreground">{event.code}</span>
                    </div>
                  </div>
                  <CardTitle className="text-base">{event.name}</CardTitle>
                  {event.description && (
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />{event.venue}
                    </div>
                  )}
                  {event.eventDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />{new Date(event.eventDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />{event._count.accreditations} records
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
