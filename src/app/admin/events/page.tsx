'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Plus, Calendar, MapPin, Users, Play, CheckCircle, Archive } from 'lucide-react';
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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Management</h1>
          <p className="text-muted-foreground">Create, activate, and manage events</p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Active Event Banner */}
      {activeEvent && (
        <Card className="border-success/30 bg-success/5">
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActionEvent({ event: activeEvent, action: 'complete' })}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* All Events */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading events...</div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-4">Create your first event to get started.</p>
            <Link href="/admin/events/new">
              <Button><Plus className="h-4 w-4 mr-2" />Create Event</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.filter((e) => e.status !== 'ACTIVE').map((event) => (
            <Card key={event.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_STYLES[event.status] || ''}>
                      {event.status}
                    </Badge>
                    <span className="font-medium">{event.name}</span>
                    <span className="text-sm text-muted-foreground">({event.code})</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {event.venue && <span className="mr-3">{event.venue}</span>}
                    {event.eventDate && <span className="mr-3">{new Date(event.eventDate).toLocaleDateString()}</span>}
                    <span>{event._count.accreditations} records</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {event.status === 'DRAFT' && (
                    <Button variant="outline" size="sm" onClick={() => setActionEvent({ event, action: 'activate' })}>
                      <Play className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  {event.status === 'COMPLETED' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setActionEvent({ event, action: 'activate' })}>
                        <Play className="h-4 w-4 mr-1" />
                        Reactivate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setActionEvent({ event, action: 'archive' })}>
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    </>
                  )}
                  {(event.status === 'COMPLETED' || event.status === 'ARCHIVED') && (
                    <Link href={`/admin/archive/${event.id}`}>
                      <Button variant="ghost" size="sm">View Archive</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
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
