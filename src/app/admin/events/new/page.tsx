import { ProjectForm } from '@/components/accreditation';

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-muted-foreground">Set up a new accreditation event</p>
      </div>

      <ProjectForm mode="create" />
    </div>
  );
}
