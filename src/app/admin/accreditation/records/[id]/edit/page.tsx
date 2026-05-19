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
}

export default function EditAccreditationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [accreditationId, setAccreditationId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('DRAFT');
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<AccreditationProject | null>(null);
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
    params.then(({ id }) => {
      setAccreditationId(id);
      fetchAccreditation(id);
    });
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  const fetchAccreditation = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditations/${id}`);
      if (response.ok) {
        const data = await response.json();
        const record = data.accreditation;

        setCurrentStatus(record.status);
        setProjectId(record.projectId);

        if (record.photoUrl) {
          setPhotoPreview(record.photoUrl);
        }

        setFormData({
          firstName: record.firstName || '',
          lastName: record.lastName || '',
          company: record.company || '',
          role: record.role || '',
          accessGroup: record.accessGroup || '',
          qidNumber: record.qidNumber || '',
          hasBumpInAccess: record.hasBumpInAccess || false,
          bumpInStart: record.bumpInStart ? record.bumpInStart.slice(0, 10) : '',
          bumpInEnd: record.bumpInEnd ? record.bumpInEnd.slice(0, 10) : '',
          hasLiveAccess: record.hasLiveAccess || false,
          liveStart: record.liveStart ? record.liveStart.slice(0, 10) : '',
          liveEnd: record.liveEnd ? record.liveEnd.slice(0, 10) : '',
          hasBumpOutAccess: record.hasBumpOutAccess || false,
          bumpOutStart: record.bumpOutStart ? record.bumpOutStart.slice(0, 10) : '',
          bumpOutEnd: record.bumpOutEnd ? record.bumpOutEnd.slice(0, 10) : '',
        });
      } else {
        toast.error('Failed to load accreditation');
        router.push('/admin/records');
      }
    } catch (error) {
      console.error('Error fetching accreditation:', error);
      toast.error('Failed to load accreditation');
      router.push('/admin/records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProject = async (id: string) => {
    try {
      const response = await fetch(`/api/accreditation/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
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
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!accreditationId) return;

    if (!formData.firstName || !formData.lastName || !formData.company || !formData.role || !formData.accessGroup) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/accreditations/${accreditationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update accreditation');
      }

      // If submitForApproval and status is DRAFT, submit for approval
      if (submitForApproval && currentStatus === 'DRAFT') {
        const submitResponse = await fetch(`/api/accreditations/${accreditationId}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          toast.warning('Updated successfully, but failed to submit for approval');
        } else {
          toast.success('Updated and submitted for approval successfully');
        }
      } else {
        toast.success('Accreditation updated successfully');
      }

      if (projectId) {
        router.push('/admin/records');
      } else {
        router.back();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update accreditation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading accreditation data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (accreditationId) {
                router.push(`/admin/records/${accreditationId}`);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Record
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Accreditation</h1>
          <p className="text-gray-600 mt-1">Update event personnel accreditation</p>
        </div>

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
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company/Organization *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role/Job Title *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessGroup">Access Group *</Label>
                <Select
                  value={formData.accessGroup}
                  onValueChange={(value) => setFormData({ ...formData, accessGroup: value })}
                >
                  <SelectTrigger id="accessGroup">
                    <SelectValue placeholder="Select access group" />
                  </SelectTrigger>
                  <SelectContent>
                    {project?.accessGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qidNumber">QID Number (Optional)</Label>
                <Input
                  id="qidNumber"
                  value={formData.qidNumber}
                  onChange={(e) => setFormData({ ...formData, qidNumber: e.target.value })}
                  placeholder="11 digit QID"
                  maxLength={11}
                />
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-start gap-4">
                  {photoPreview ? (
                    <NextImage src={photoPreview} alt="Preview" width={100} height={100} className="rounded-lg object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">JPG or PNG, max 5MB</p>
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
                  <Checkbox
                    id="bumpIn"
                    checked={formData.hasBumpInAccess}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasBumpInAccess: checked === true })}
                  />
                  <Label htmlFor="bumpIn" className="font-semibold">Bump-In Access</Label>
                </div>
                {formData.hasBumpInAccess && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpInStart">Start Date</Label>
                      <Input
                        id="bumpInStart"
                        type="date"
                        value={formData.bumpInStart}
                        onChange={(e) => setFormData({ ...formData, bumpInStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bumpInEnd">End Date</Label>
                      <Input
                        id="bumpInEnd"
                        type="date"
                        value={formData.bumpInEnd}
                        onChange={(e) => setFormData({ ...formData, bumpInEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="live"
                    checked={formData.hasLiveAccess}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasLiveAccess: checked === true })}
                  />
                  <Label htmlFor="live" className="font-semibold">Live Access</Label>
                </div>
                {formData.hasLiveAccess && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="liveStart">Start Date</Label>
                      <Input
                        id="liveStart"
                        type="date"
                        value={formData.liveStart}
                        onChange={(e) => setFormData({ ...formData, liveStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liveEnd">End Date</Label>
                      <Input
                        id="liveEnd"
                        type="date"
                        value={formData.liveEnd}
                        onChange={(e) => setFormData({ ...formData, liveEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bump-Out */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bumpOut"
                    checked={formData.hasBumpOutAccess}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasBumpOutAccess: checked === true })}
                  />
                  <Label htmlFor="bumpOut" className="font-semibold">Bump-Out Access</Label>
                </div>
                {formData.hasBumpOutAccess && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bumpOutStart">Start Date</Label>
                      <Input
                        id="bumpOutStart"
                        type="date"
                        value={formData.bumpOutStart}
                        onChange={(e) => setFormData({ ...formData, bumpOutStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bumpOutEnd">End Date</Label>
                      <Input
                        id="bumpOutEnd"
                        type="date"
                        value={formData.bumpOutEnd}
                        onChange={(e) => setFormData({ ...formData, bumpOutEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()} type="button">
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSubmitting} type="button">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {currentStatus === 'DRAFT' && (
              <Button onClick={() => handleSubmit(true)} disabled={isSubmitting} type="button">
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
