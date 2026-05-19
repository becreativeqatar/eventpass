'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export interface EventSummary {
  id: string;
  name: string;
  code: string;
  status: string;
  description: string | null;
  venue: string | null;
  eventDate: string | null;
  _count: { accreditations: number };
}

interface EventContextValue {
  selectedProject: EventSummary | null;
  events: EventSummary[];
  isLoading: boolean;
  isReadOnly: boolean;
  selectEvent: (id: string) => void;
  refetchEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextValue | null>(null);

const COOKIE_NAME = 'ep_selected_event';
const LS_KEY = 'ep_selected_event';

function setCookie(id: string) {
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=31536000; SameSite=Lax`;
}

function getCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

export function EventProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<EventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) return;
      const data = await res.json();
      const list: EventSummary[] = data.data || [];
      setEvents(list);

      // Resolve selection: cookie → localStorage → active event
      const persistedId = getCookie() || localStorage.getItem(LS_KEY);
      const persisted = persistedId ? list.find((e) => e.id === persistedId) : null;
      const active = list.find((e) => e.status === 'ACTIVE');
      const resolved = persisted || active || list[0] || null;

      setSelectedProject(resolved);
      if (resolved) {
        setCookie(resolved.id);
        localStorage.setItem(LS_KEY, resolved.id);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEvents();
    }
  }, [status, fetchEvents]);

  const selectEvent = useCallback(
    (id: string) => {
      const event = events.find((e) => e.id === id);
      if (!event) return;
      setSelectedProject(event);
      setCookie(id);
      localStorage.setItem(LS_KEY, id);
    },
    [events]
  );

  const isReadOnly = selectedProject?.status !== 'ACTIVE';

  return (
    <EventContext.Provider
      value={{
        selectedProject,
        events,
        isLoading,
        isReadOnly,
        selectEvent,
        refetchEvents: fetchEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEventContext must be used within EventProvider');
  return ctx;
}
