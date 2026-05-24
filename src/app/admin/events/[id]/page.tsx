'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Pencil,
  Play,
  CheckCircle,
  Archive,
  ArrowLeft,
  ClipboardList,
  ScanLine,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { format } from 'date-fns';

interface EventDetail {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  venue: string | null;
  eventDate: string | null;
  status: string;
  accessGroups: string;
  bumpInStart: string | null;
  bumpInEnd: string | null;
  liveStart: string | null;
  liveEnd: string | null;
  bumpOutStart: string | null;
  bumpOutEnd: string | null;
  createdAt: string;
  _count?: { accreditations: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  ACTIVE: 'bg-success/20 text-success',
  COMPLETED: 'bg-primary/10 text-primary',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

function formatDate(date: string | null) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionEvent, setActionEvent] = useState<{ action: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Set as selected event
    document.cookie = `ep_selected_event=${id};path=/;max-age=31536000`;

    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setEvent(data.data);
      } catch {
        toast.error('Event not found');
        router.push('/admin/events');
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id, router]);

  const handleAction = async () => {
    if (!actionEvent || !event) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/${actionEvent.action}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success(`Event ${actionEvent.action}d successfully`);
        const data = await res.json();
        setEvent(data.data || event);
        router.refresh();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) return null;

  const accessGroups = event.accessGroups ? event.accessGroups.split(',').map(g => g.trim()) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/admin/events')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
                <Badge className={STATUS_STYLES[event.status] || ''}>{event.status}</Badge>
              </div>
              {event.code && <p className="text-sm text-muted-foreground">{event.code}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {event.status === 'DRAFT' && (
            <Button variant="outline" size="sm" onClick={() => setActionEvent({ action: 'activate' })}>
              <Play className="h-4 w-4 mr-1" /> Activate
            </Button>
          )}
          {event.status === 'ACTIVE' && (
            <Button variant="outline" size="sm" onClick={() => setActionEvent({ action: 'complete' })}>
              <CheckCircle className="h-4 w-4 mr-1" /> Complete
            </Button>
          )}
          {event.status === 'COMPLETED' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setActionEvent({ action: 'activate' })}>
                <Play className="h-4 w-4 mr-1" /> Reactivate
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActionEvent({ action: 'archive' })}>
                <Archive className="h-4 w-4 mr-1" /> Archive
              </Button>
            </>
          )}
          {event.status !== 'ARCHIVED' && (
            <Link href={`/admin/events/${(event.code || event.id).toLowerCase()}/edit`}>
              <Button size="sm">
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/admin/events/${(event.code || event.id).toLowerCase()}/records`}>
          <Card className="transition-colors hover:border-primary/30 cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Records</p>
                <p className="text-xs text-muted-foreground">{event._count?.accreditations || 0} accreditations</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/events/${(event.code || event.id).toLowerCase()}/scans`}>
          <Card className="transition-colors hover:border-primary/30 cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <ScanLine className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Scan History</p>
                <p className="text-xs text-muted-foreground">View all scans</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/admin/events/${(event.code || event.id).toLowerCase()}/reports`}>
          <Card className="transition-colors hover:border-primary/30 cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Reports</p>
                <p className="text-xs text-muted-foreground">Analytics & exports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {event.description && (
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Description</p>
                <p>{event.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Venue</p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {event.venue || '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Event Date</p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(event.eventDate)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Records</p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {event._count?.accreditations || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Created</p>
                <p>{formatDate(event.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase font-medium mb-1.5">Access Groups</p>
              <div className="flex flex-wrap gap-1.5">
                {accessGroups.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phase Schedule</CardTitle>
            <CardDescription>Event phase date ranges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Bump-In</p>
              <p className="text-muted-foreground">
                {formatDate(event.bumpInStart)} → {formatDate(event.bumpInEnd)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Live Event</p>
              <p className="text-muted-foreground">
                {formatDate(event.liveStart)} → {formatDate(event.liveEnd)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Bump-Out</p>
              <p className="text-muted-foreground">
                {formatDate(event.bumpOutStart)} → {formatDate(event.bumpOutEnd)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!actionEvent}
        onOpenChange={() => setActionEvent(null)}
        title={`${actionEvent?.action === 'activate' ? 'Activate' : actionEvent?.action === 'complete' ? 'Complete' : 'Archive'} Event`}
        description={
          actionEvent?.action === 'activate'
            ? `Activate "${event.name}"? The current active event will be marked as completed.`
            : actionEvent?.action === 'complete'
            ? `Mark "${event.name}" as completed?`
            : `Archive "${event.name}"? Archived events are read-only.`
        }
        confirmLabel={actionEvent?.action === 'activate' ? 'Activate' : actionEvent?.action === 'complete' ? 'Complete' : 'Archive'}
        onConfirm={handleAction}
        loading={processing}
      />
    </div>
  );
}
