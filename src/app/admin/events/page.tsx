'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Plus, Calendar, MapPin, Users, Play, CheckCircle, Archive, Pencil } from 'lucide-react';
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
  const router = useRouter();
  const [actionEvent, setActionEvent] = useState<{ event: Event; action: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data.data || []);
    } catch {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleAction = async () => {
    if (!actionEvent) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/events/${actionEvent.event.id}/${actionEvent.action}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success(`Event ${actionEvent.action}d successfully`);
        fetchEvents();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setProcessing(false);
      setActionEvent(null);
    }
  };

  const activeEvent = events.find((e) => e.status === 'ACTIVE');
  const filteredEvents = events.filter((e) => {
    if (filter === 'All') return e.status !== 'ACTIVE';
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

      {/* Active Event Banner */}
      {activeEvent && (filter === 'All' || filter === 'Active') && (
        <Link href={`/admin/events/${activeEvent.code || activeEvent.id}`} className="block">
          <Card className="border-success/30 bg-success/5 transition-colors hover:border-success/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success/20 text-success">ACTIVE</Badge>
                    <CardTitle className="text-lg">{activeEvent.name}</CardTitle>
                  </div>
                  <CardDescription className="mt-1">
                    {activeEvent.venue && <span className="inline-flex items-center gap-1 mr-4"><MapPin className="h-3 w-3" />{activeEvent.venue}</span>}
                    {activeEvent.eventDate && <span className="inline-flex items-center gap-1 mr-4"><Calendar className="h-3 w-3" />{new Date(activeEvent.eventDate).toLocaleDateString()}</span>}
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{activeEvent._count.accreditations} records</span>
                  </CardDescription>
                </div>
                {isAdmin && (
                  <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/events/${activeEvent.id}/edit`)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActionEvent({ event: activeEvent, action: 'complete' })}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </Link>
      )}

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
            <Link key={event.id} href={`/admin/events/${event.code || event.id}`}>
              <Card className="transition-colors hover:border-primary/30 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={STATUS_STYLES[event.status] || ''}>{event.status}</Badge>
                      <span className="text-xs text-muted-foreground">{event.code}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                        {(event.status === 'DRAFT' || event.status === 'COMPLETED') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/admin/events/${event.id}/edit`)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {event.status === 'DRAFT' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActionEvent({ event, action: 'activate' })} title="Activate">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {event.status === 'COMPLETED' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActionEvent({ event, action: 'activate' })} title="Reactivate">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActionEvent({ event, action: 'archive' })} title="Archive">
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
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

      <ConfirmDialog
        open={!!actionEvent}
        onOpenChange={() => setActionEvent(null)}
        title={`${actionEvent?.action === 'activate' ? 'Activate' : actionEvent?.action === 'complete' ? 'Complete' : 'Archive'} Event`}
        description={
          actionEvent?.action === 'activate'
            ? `Activate "${actionEvent?.event.name}"? The current active event will be marked as completed.`
            : actionEvent?.action === 'complete'
            ? `Mark "${actionEvent?.event.name}" as completed?`
            : `Archive "${actionEvent?.event.name}"? Archived events are read-only.`
        }
        confirmLabel={actionEvent?.action === 'activate' ? 'Activate' : actionEvent?.action === 'complete' ? 'Complete' : 'Archive'}
        onConfirm={handleAction}
        loading={processing}
      />

    </div>
  );
}
