'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Upload, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import NextImage from 'next/image';

interface ActiveProject {
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
}

export default function NewRecordPage() {
  const router = useRouter();
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    role: '',
    accessGroup: '',
    qidNumber: '',
    hasBumpInAccess: true,
    bumpInStart: '',
    bumpInEnd: '',
    hasLiveAccess: true,
    liveStart: '',
    liveEnd: '',
    hasBumpOutAccess: true,
    bumpOutStart: '',
    bumpOutEnd: '',
  });

  useEffect(() => {
    fetchActiveProject();
  }, []);

  const fetchActiveProject = async () => {
    try {
      const response = await fetch('/api/active-project');
      if (response.ok) {
        const data = await response.json();
        const proj = data.project;
        if (!proj) {
          toast.error('No active event found');
          router.push('/admin/events');
          return;
        }
        setProject(proj);
        setFormData((prev) => ({
          ...prev,
          bumpInStart: proj.bumpInStart?.slice(0, 10) || '',
          bumpInEnd: proj.bumpInEnd?.slice(0, 10) || '',
          liveStart: proj.liveStart?.slice(0, 10) || '',
          liveEnd: proj.liveEnd?.slice(0, 10) || '',
          bumpOutStart: proj.bumpOutStart?.slice(0, 10) || '',
          bumpOutEnd: proj.bumpOutEnd?.slice(0, 10) || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching active project:', error);
      toast.error('Failed to load active event');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG and PNG files are allowed');
        e.target.value = '';
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'PENDING') => {
    if (!project) {
      toast.error('No active event');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.company || !formData.role || !formData.accessGroup) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/accreditations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          role: formData.role,
          accessGroup: formData.accessGroup,
          qidNumber: formData.qidNumber || null,
          hasBumpInAccess: formData.hasBumpInAccess,
          bumpInStart: formData.hasBumpInAccess && formData.bumpInStart ? new Date(formData.bumpInStart).toISOString() : null,
          bumpInEnd: formData.hasBumpInAccess && formData.bumpInEnd ? new Date(formData.bumpInEnd).toISOString() : null,
          hasLiveAccess: formData.hasLiveAccess,
          liveStart: formData.hasLiveAccess && formData.liveStart ? new Date(formData.liveStart).toISOString() : null,
          liveEnd: formData.hasLiveAccess && formData.liveEnd ? new Date(formData.liveEnd).toISOString() : null,
          hasBumpOutAccess: formData.hasBumpOutAccess,
          bumpOutStart: formData.hasBumpOutAccess && formData.bumpOutStart ? new Date(formData.bumpOutStart).toISOString() : null,
          bumpOutEnd: formData.hasBumpOutAccess && formData.bumpOutEnd ? new Date(formData.bumpOutEnd).toISOString() : null,
          status: 'DRAFT',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create accreditation');
      }

      const { data: accreditation } = await response.json();

      if (status === 'PENDING') {
        const submitResponse = await fetch(`/api/accreditations/${accreditation.id}/submit`, {
          method: 'POST',
        });
        if (!submitResponse.ok) {
          toast.warning('Created as draft, but failed to submit for approval');
        }
      }

      toast.success(status === 'DRAFT' ? 'Draft saved successfully' : 'Submitted for approval');
      router.push('/admin/records');
    } catch (error) {
      console.error('Error creating accreditation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create accreditation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground mt-4">New Accreditation</h1>
          <p className="text-muted-foreground mt-1">Create a new event personnel accreditation</p>
        </div>

        {!project ? (
          <p className="text-muted-foreground">Loading active event...</p>
        ) : (
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company/Organization *</Label>
                  <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role/Job Title *</Label>
                  <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessGroup">Access Group *</Label>
                  <Select value={formData.accessGroup} onValueChange={(value) => setFormData({ ...formData, accessGroup: value })}>
                    <SelectTrigger id="accessGroup">
                      <SelectValue placeholder="Select access group" />
                    </SelectTrigger>
                    <SelectContent>
                      {project?.accessGroups.map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qidNumber">QID Number (Optional)</Label>
                  <Input id="qidNumber" value={formData.qidNumber} onChange={(e) => setFormData({ ...formData, qidNumber: e.target.value })} placeholder="11 digit QID" maxLength={11} />
                </div>

                {/* Profile Photo */}
                <div className="space-y-2">
                  <Label>Profile Photo (Optional)</Label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted-foreground/20 transition-colors overflow-hidden" onClick={() => fileInputRef.current?.click()}>
                      {photoPreview ? (
                        <NextImage src={photoPreview} alt="Preview" width={96} height={96} className="object-cover w-full h-full" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Photo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">JPG or PNG, max 5MB</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Validity */}
            <Card>
              <CardHeader>
                <CardTitle>Access Validity</CardTitle>
                <CardDescription>Select the phases and customize access dates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bump-In */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bumpIn" checked={formData.hasBumpInAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasBumpInAccess: checked === true })} />
                    <Label htmlFor="bumpIn" className="font-semibold">Bump-In Access</Label>
                  </div>
                  {formData.hasBumpInAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bumpInStart">Start Date</Label>
                        <Input id="bumpInStart" type="date" value={formData.bumpInStart} onChange={(e) => setFormData({ ...formData, bumpInStart: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bumpInEnd">End Date</Label>
                        <Input id="bumpInEnd" type="date" value={formData.bumpInEnd} onChange={(e) => setFormData({ ...formData, bumpInEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="live" checked={formData.hasLiveAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasLiveAccess: checked === true })} />
                    <Label htmlFor="live" className="font-semibold">Live Access</Label>
                  </div>
                  {formData.hasLiveAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="liveStart">Start Date</Label>
                        <Input id="liveStart" type="date" value={formData.liveStart} onChange={(e) => setFormData({ ...formData, liveStart: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="liveEnd">End Date</Label>
                        <Input id="liveEnd" type="date" value={formData.liveEnd} onChange={(e) => setFormData({ ...formData, liveEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bump-Out */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bumpOut" checked={formData.hasBumpOutAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasBumpOutAccess: checked === true })} />
                    <Label htmlFor="bumpOut" className="font-semibold">Bump-Out Access</Label>
                  </div>
                  {formData.hasBumpOutAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bumpOutStart">Start Date</Label>
                        <Input id="bumpOutStart" type="date" value={formData.bumpOutStart} onChange={(e) => setFormData({ ...formData, bumpOutStart: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bumpOutEnd">End Date</Label>
                        <Input id="bumpOutEnd" type="date" value={formData.bumpOutEnd} onChange={(e) => setFormData({ ...formData, bumpOutEnd: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
              <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={isSubmitting} type="button">
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button onClick={() => handleSubmit('PENDING')} disabled={isSubmitting} type="button">
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
