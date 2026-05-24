'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Plus, Edit } from 'lucide-react';
import { toQatarDateString } from '@/lib/date';
import { toast } from 'sonner';

interface AccreditationProject {
  id: string;
  name: string;
  code: string;
  bumpInStart: string;
  bumpInEnd: string;
  liveStart: string;
  liveEnd: string;
  bumpOutStart: string;
  bumpOutEnd: string;
  accessGroups: string[];
  _count: {
    accreditations: number;
  };
}

export default function AccreditationProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<AccreditationProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    bumpInStart: '',
    bumpInEnd: '',
    liveStart: '',
    liveEnd: '',
    bumpOutStart: '',
    bumpOutEnd: '',
    accessGroups: ['VIP', 'VVIP', 'Organiser', 'Contractor', 'Medical', 'Security', 'Media'],
    newAccessGroup: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/accreditation/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate date sequences
      const bumpInEndDate = new Date(formData.bumpInEnd);
      const liveStartDate = new Date(formData.liveStart);
      const liveEndDate = new Date(formData.liveEnd);
      const bumpOutStartDate = new Date(formData.bumpOutStart);

      if (bumpInEndDate >= liveStartDate) {
        toast.error('Bump-In End must be before Live Start date');
        setIsSubmitting(false);
        return;
      }

      if (liveEndDate >= bumpOutStartDate) {
        toast.error('Live End must be before Bump-Out Start date');
        setIsSubmitting(false);
        return;
      }

      const url = isEditMode
        ? `/api/accreditation/projects/${editingProjectId}`
        : '/api/accreditation/projects';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          bumpInStart: new Date(formData.bumpInStart),
          bumpInEnd: new Date(formData.bumpInEnd),
          liveStart: new Date(formData.liveStart),
          liveEnd: new Date(formData.liveEnd),
          bumpOutStart: new Date(formData.bumpOutStart),
          bumpOutEnd: new Date(formData.bumpOutEnd),
          accessGroups: formData.accessGroups,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} project`);
      }

      toast.success(`Project ${isEditMode ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      fetchProjects();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} project`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      bumpInStart: '',
      bumpInEnd: '',
      liveStart: '',
      liveEnd: '',
      bumpOutStart: '',
      bumpOutEnd: '',
      accessGroups: ['VIP', 'VVIP', 'Organiser', 'Contractor', 'Medical', 'Security', 'Media'],
      newAccessGroup: '',
    });
    setIsEditMode(false);
    setEditingProjectId(null);
  };

  const handleEditProject = (project: AccreditationProject) => {
    setIsEditMode(true);
    setEditingProjectId(project.id);
    setFormData({
      name: project.name,
      code: project.code || '',
      bumpInStart: toQatarDateString(project.bumpInStart),
      bumpInEnd: toQatarDateString(project.bumpInEnd),
      liveStart: toQatarDateString(project.liveStart),
      liveEnd: toQatarDateString(project.liveEnd),
      bumpOutStart: toQatarDateString(project.bumpOutStart),
      bumpOutEnd: toQatarDateString(project.bumpOutEnd),
      accessGroups: Array.isArray(project.accessGroups) ? project.accessGroups : [],
      newAccessGroup: '',
    });
    setIsDialogOpen(true);
  };

  const addAccessGroup = () => {
    if (formData.newAccessGroup && !formData.accessGroups.includes(formData.newAccessGroup)) {
      setFormData({
        ...formData,
        accessGroups: [...formData.accessGroups, formData.newAccessGroup],
        newAccessGroup: '',
      });
    }
  };

  const removeAccessGroup = (group: string) => {
    setFormData({
      ...formData,
      accessGroups: formData.accessGroups.filter((g) => g !== group),
    });
  };

  const isProjectCompleted = (bumpOutEnd: string) => {
    const endDate = new Date(bumpOutEnd);
    const now = new Date();
    return now > endDate;
  };

  const getProjectStatus = (bumpOutEnd: string) => {
    return isProjectCompleted(bumpOutEnd) ? 'Completed' : 'Active';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Accreditation Events</h1>
              <p className="text-muted-foreground mt-1">View and manage event accreditation projects</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No accreditation events</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first accreditation event</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => {
                const isCompleted = isProjectCompleted(project.bumpOutEnd);
                const status = getProjectStatus(project.bumpOutEnd);

                return (
                  <Card key={project.id} className={`shadow-sm hover:shadow-md transition-all ${isCompleted ? 'opacity-75' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className={`text-lg ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">Code: {project.code}</CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={isCompleted ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success border-success/30'}
                        >
                          {status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bump-In:</span>
                          <span className="font-medium text-foreground">
                            {formatDate(project.bumpInStart)} - {formatDate(project.bumpInEnd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Live:</span>
                          <span className="font-medium text-foreground">
                            {formatDate(project.liveStart)} - {formatDate(project.liveEnd)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bump-Out:</span>
                          <span className="font-medium text-foreground">
                            {formatDate(project.bumpOutStart)} - {formatDate(project.bumpOutEnd)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Access Groups:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(project.accessGroups) && project.accessGroups.map((group) => (
                            <Badge key={group} variant="outline" className="text-xs text-foreground">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">
                            {project._count.accreditations} accreditation record{project._count.accreditations !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                            className="text-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <Button
                          onClick={() => router.push(`/admin/accreditation/projects/${project.id}`)}
                          className="w-full bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        >
                          Open Event
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create/Edit Project Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Accreditation Event' : 'Create Accreditation Event'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update phase dates and access groups for event accreditation' : 'Set up phase dates and access groups for event accreditation'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Qatar World Cup 2025"
                    required
                    disabled={isEditMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Project Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., QWC2025"
                    required
                    maxLength={20}
                    disabled={isEditMode}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Phase Dates</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bumpInStart">Bump-In Start *</Label>
                    <DatePicker
                      value={formData.bumpInStart}
                      onChange={(date) => setFormData({ ...formData, bumpInStart: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpInEnd">Bump-In End *</Label>
                    <DatePicker
                      value={formData.bumpInEnd}
                      onChange={(date) => setFormData({ ...formData, bumpInEnd: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="liveStart">Live Start *</Label>
                    <DatePicker
                      value={formData.liveStart}
                      onChange={(date) => setFormData({ ...formData, liveStart: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="liveEnd">Live End *</Label>
                    <DatePicker
                      value={formData.liveEnd}
                      onChange={(date) => setFormData({ ...formData, liveEnd: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutStart">Bump-Out Start *</Label>
                    <DatePicker
                      value={formData.bumpOutStart}
                      onChange={(date) => setFormData({ ...formData, bumpOutStart: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutEnd">Bump-Out End *</Label>
                    <DatePicker
                      value={formData.bumpOutEnd}
                      onChange={(date) => setFormData({ ...formData, bumpOutEnd: date ? toQatarDateString(date) : '' })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access Groups</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.accessGroups.map((group) => (
                    <Badge
                      key={group}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeAccessGroup(group)}
                    >
                      {group} x
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add access group"
                    value={formData.newAccessGroup}
                    onChange={(e) => setFormData({ ...formData, newAccessGroup: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAccessGroup();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addAccessGroup}>
                    Add
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (isEditMode ? 'Updating...' : 'Creating...')
                    : (isEditMode ? 'Update Event' : 'Create Event')
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
