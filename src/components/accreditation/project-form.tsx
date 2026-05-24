'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { createProjectSchema, type CreateProjectRequest, ProjectStatus, stringToAccessGroups } from '@/lib/validations/accreditation';

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    code?: string | null;
    description?: string | null;
    eventDate?: string | null;
    venue?: string | null;
    status: string;
    accessGroups?: string;
    bumpInStart?: string | null;
    bumpInEnd?: string | null;
    liveStart?: string | null;
    liveEnd?: string | null;
    bumpOutStart?: string | null;
    bumpOutEnd?: string | null;
  };
  mode: 'create' | 'edit';
}

const PRESET_GROUPS = ['General', 'VIP', 'Staff', 'Media', 'Artist', 'Crew', 'Security', 'Catering'];

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState('');

  const initialGroups = project?.accessGroups
    ? stringToAccessGroups(project.accessGroups)
    : ['General'];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name || '',
      code: project?.code || '',
      description: project?.description || '',
      eventDate: project?.eventDate ? new Date(project.eventDate) : undefined,
      venue: project?.venue || '',
      status: (project?.status || 'ACTIVE') as 'ACTIVE' | 'DRAFT' | 'COMPLETED' | 'ARCHIVED',
      accessGroups: initialGroups,
      bumpInStart: project?.bumpInStart ? new Date(project.bumpInStart) : undefined,
      bumpInEnd: project?.bumpInEnd ? new Date(project.bumpInEnd) : undefined,
      liveStart: project?.liveStart ? new Date(project.liveStart) : undefined,
      liveEnd: project?.liveEnd ? new Date(project.liveEnd) : undefined,
      bumpOutStart: project?.bumpOutStart ? new Date(project.bumpOutStart) : undefined,
      bumpOutEnd: project?.bumpOutEnd ? new Date(project.bumpOutEnd) : undefined,
    },
  });

  const status = watch('status');
  const accessGroups = watch('accessGroups') || [];

  const addAccessGroup = () => {
    if (newGroup.trim() && !accessGroups.includes(newGroup.trim())) {
      setValue('accessGroups', [...accessGroups, newGroup.trim()]);
      setNewGroup('');
    }
  };

  const removeAccessGroup = (group: string) => {
    if (accessGroups.length > 1) {
      setValue('accessGroups', accessGroups.filter((g: string) => g !== group));
    }
  };

  const addPresetGroup = (group: string) => {
    if (!accessGroups.includes(group)) {
      setValue('accessGroups', [...accessGroups, group]);
    }
  };

  const onSubmit = async (data: CreateProjectRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/events' : `/api/events/${project?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save project');
      }

      const result = await res.json();
      toast.success(mode === 'create' ? 'Project created' : 'Project updated');
      router.push('/admin/events');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch all date fields for display and validation
  const eventDate = watch('eventDate');
  const bumpInStart = watch('bumpInStart');
  const bumpInEnd = watch('bumpInEnd');
  const liveStart = watch('liveStart');
  const liveEnd = watch('liveEnd');
  const bumpOutStart = watch('bumpOutStart');
  const bumpOutEnd = watch('bumpOutEnd');

  const checkRange = (start: unknown, end: unknown): string | null => {
    if (start && end && new Date(start as string) > new Date(end as string)) {
      return 'Start date must be before end date';
    }
    return null;
  };

  const bumpInDateError = checkRange(bumpInStart, bumpInEnd);
  const liveDateError = checkRange(liveStart, liveEnd);
  const bumpOutDateError = checkRange(bumpOutStart, bumpOutEnd);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" {...register('name')} placeholder="Enter project name" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Project Code</Label>
              <Input id="code" {...register('code')} placeholder="Auto-generated if left empty" maxLength={20} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as keyof typeof ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <DatePicker
                id="eventDate"
                value={eventDate}
                onChange={(date) => setValue('eventDate', date ?? undefined)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Project description" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" {...register('venue')} placeholder="Event venue" />
          </div>

          <div className="space-y-3">
            <Label>Access Groups *</Label>
            <p className="text-sm text-muted-foreground">
              Define the access groups available for accreditations in this project.
            </p>
            <div className="flex flex-wrap gap-2">
              {accessGroups.map((group: string) => (
                <Badge key={group} variant="secondary" className="text-sm py-1">
                  {group}
                  {accessGroups.length > 1 && (
                    <button type="button" onClick={() => removeAccessGroup(group)} className="ml-1.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="Add custom group..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAccessGroup(); } }}
              />
              <Button type="button" variant="outline" onClick={addAccessGroup}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {/* Preset groups */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 self-center">Presets:</span>
              {PRESET_GROUPS.filter(g => !accessGroups.includes(g)).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => addPresetGroup(group)}
                  className="text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + {group}
                </button>
              ))}
            </div>
            {errors.accessGroups && <p className="text-sm text-destructive">{errors.accessGroups.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Phase Schedule
          </CardTitle>
          <CardDescription>
            Define the date ranges for each event phase. End dates must be after start dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bump-In */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bump-In</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bumpInStart">Start</Label>
                <DatePicker
                  id="bumpInStart"
                  value={bumpInStart}
                  onChange={(date) => setValue('bumpInStart', date ?? undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bumpInEnd">End</Label>
                <DatePicker
                  id="bumpInEnd"
                  value={bumpInEnd}
                  onChange={(date) => setValue('bumpInEnd', date ?? undefined)}
                />
              </div>
            </div>
            {bumpInDateError && <p className="text-sm text-destructive">{bumpInDateError}</p>}
          </div>

          {/* Live */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Live Event</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="liveStart">Start</Label>
                <DatePicker
                  id="liveStart"
                  value={liveStart}
                  onChange={(date) => setValue('liveStart', date ?? undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveEnd">End</Label>
                <DatePicker
                  id="liveEnd"
                  value={liveEnd}
                  onChange={(date) => setValue('liveEnd', date ?? undefined)}
                />
              </div>
            </div>
            {liveDateError && <p className="text-sm text-destructive">{liveDateError}</p>}
          </div>

          {/* Bump-Out */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bump-Out</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bumpOutStart">Start</Label>
                <DatePicker
                  id="bumpOutStart"
                  value={bumpOutStart}
                  onChange={(date) => setValue('bumpOutStart', date ?? undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bumpOutEnd">End</Label>
                <DatePicker
                  id="bumpOutEnd"
                  value={bumpOutEnd}
                  onChange={(date) => setValue('bumpOutEnd', date ?? undefined)}
                />
              </div>
            </div>
            {bumpOutDateError && <p className="text-sm text-destructive">{bumpOutDateError}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            mode === 'create' ? 'Create Project' : 'Save Changes'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
