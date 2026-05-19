import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { Calendar, MapPin, Users, Archive } from 'lucide-react';

async function getArchivedEvents() {
  return prisma.accreditationProject.findMany({
    where: { status: { in: ['COMPLETED', 'ARCHIVED'] } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { accreditations: true } } },
  });
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-primary/10 text-primary',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export default async function ArchivePage() {
  const events = await getArchivedEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Past Events</h1>
        <p className="text-muted-foreground">Browse archived events for analytics and reporting</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No archived events</h3>
            <p className="text-muted-foreground">Completed events will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/admin/archive/${event.id}`}>
              <Card className="transition-colors hover:border-primary/30 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={STATUS_STYLES[event.status] || ''}>{event.status}</Badge>
                    <span className="text-xs text-muted-foreground">{event.code}</span>
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
