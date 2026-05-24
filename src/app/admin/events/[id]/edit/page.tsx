'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/accreditation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EventData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  eventDate: string | null;
  venue: string | null;
  status: string;
  accessGroups: string;
  bumpInStart: string | null;
  bumpInEnd: string | null;
  liveStart: string | null;
  liveEnd: string | null;
  bumpOutStart: string | null;
  bumpOutEnd: string | null;
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch event');
        }
        const data = await res.json();
        setEvent(data.data);
      } catch {
        toast.error('Failed to load event');
        router.push('/admin/events');
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <p className="text-muted-foreground">Update event details and scheduling</p>
      </div>

      <ProjectForm project={event} mode="edit" />
    </div>
  );
}
