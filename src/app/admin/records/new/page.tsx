'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowLeft, Upload, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import NextImage from 'next/image';
import { toQatarDateString } from '@/lib/date';
import { CountryInput } from '@/components/ui/country-input';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => {
    if (!email) { setFieldWarnings(prev => ({ ...prev, email: '' })); return; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldWarnings(prev => ({ ...prev, email: valid ? '' : 'Invalid email format' }));
  };

  const validateExpiryDate = (field: string, dateStr: string) => {
    if (!dateStr) { setFieldWarnings(prev => ({ ...prev, [field]: '' })); return; }
    // Find the latest phase end date the user has access to
    const phaseEnds: string[] = [];
    if (formData.hasBumpInAccess && formData.bumpInEnd) phaseEnds.push(formData.bumpInEnd);
    if (formData.hasLiveAccess && formData.liveEnd) phaseEnds.push(formData.liveEnd);
    if (formData.hasBumpOutAccess && formData.bumpOutEnd) phaseEnds.push(formData.bumpOutEnd);
    // Also check project-level phase ends
    if (formData.hasBumpInAccess && project?.bumpInEnd) phaseEnds.push(toQatarDateString(project.bumpInEnd));
    if (formData.hasLiveAccess && project?.liveEnd) phaseEnds.push(toQatarDateString(project.liveEnd));
    if (formData.hasBumpOutAccess && project?.bumpOutEnd) phaseEnds.push(toQatarDateString(project.bumpOutEnd));

    const latestEnd = phaseEnds.sort().pop();
    if (latestEnd && dateStr < latestEnd) {
      setFieldWarnings(prev => ({ ...prev, [field]: 'ID expires before access period ends' }));
    } else {
      setFieldWarnings(prev => ({ ...prev, [field]: '' }));
    }
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    role: '',
    accessGroup: '',
    email: '',
    phone: '+974 ',
    identificationType: 'qid' as 'qid' | 'passport',
    qidNumber: '',
    qidExpiry: '',
    passportNumber: '',
    passportCountry: '',
    passportExpiry: '',
    hayyaNumber: '',
    hayyaExpiry: '',
    notes: '',
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
          bumpInStart: toQatarDateString(proj.bumpInStart),
          bumpInEnd: toQatarDateString(proj.bumpInEnd),
          liveStart: toQatarDateString(proj.liveStart),
          liveEnd: toQatarDateString(proj.liveEnd),
          bumpOutStart: toQatarDateString(proj.bumpOutStart),
          bumpOutEnd: toQatarDateString(proj.bumpOutEnd),
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

    const errors: Record<string, boolean> = {};
    if (!formData.firstName) errors.firstName = true;
    if (!formData.lastName) errors.lastName = true;
    if (!formData.company) errors.company = true;
    if (!formData.role) errors.role = true;
    if (!formData.accessGroup) errors.accessGroup = true;

    // At least one phase required
    if (!formData.hasBumpInAccess && !formData.hasLiveAccess && !formData.hasBumpOutAccess) {
      toast.error('At least one access phase must be selected');
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all highlighted fields');
      return;
    }
    setFieldErrors({});

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
          email: formData.email || null,
          phone: formData.phone && formData.phone.replace(/[^0-9]/g, '').length > 3 ? formData.phone.trim() : null,
          identificationType: formData.identificationType,
          qidNumber: formData.identificationType === 'qid' ? (formData.qidNumber || null) : null,
          qidExpiry: formData.identificationType === 'qid' && formData.qidExpiry ? formData.qidExpiry : null,
          passportNumber: formData.identificationType === 'passport' ? (formData.passportNumber || null) : null,
          passportCountry: formData.identificationType === 'passport' ? (formData.passportCountry || null) : null,
          passportExpiry: formData.identificationType === 'passport' && formData.passportExpiry ? formData.passportExpiry : null,
          hayyaNumber: formData.identificationType === 'passport' ? (formData.hayyaNumber || null) : null,
          hayyaExpiry: formData.identificationType === 'passport' && formData.hayyaExpiry ? formData.hayyaExpiry : null,
          notes: formData.notes || null,
          hasBumpInAccess: formData.hasBumpInAccess,
          bumpInStart: formData.hasBumpInAccess && formData.bumpInStart ? formData.bumpInStart : null,
          bumpInEnd: formData.hasBumpInAccess && formData.bumpInEnd ? formData.bumpInEnd : null,
          hasLiveAccess: formData.hasLiveAccess,
          liveStart: formData.hasLiveAccess && formData.liveStart ? formData.liveStart : null,
          liveEnd: formData.hasLiveAccess && formData.liveEnd ? formData.liveEnd : null,
          hasBumpOutAccess: formData.hasBumpOutAccess,
          bumpOutStart: formData.hasBumpOutAccess && formData.bumpOutStart ? formData.bumpOutStart : null,
          bumpOutEnd: formData.hasBumpOutAccess && formData.bumpOutEnd ? formData.bumpOutEnd : null,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create accreditation');
      }

      const { data: created } = await response.json();

      // Upload photo if selected
      if (photoFile && created?.id) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        await fetch(`/api/accreditations/${created.id}/photo`, {
          method: 'POST',
          body: photoFormData,
        });
      }

      toast.success(status === 'DRAFT' ? 'Draft saved successfully' : 'Submitted for approval');
      router.push('/admin/records');
      router.refresh();
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
                    <Input id="firstName" value={formData.firstName} onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); setFieldErrors(prev => ({ ...prev, firstName: false })); }} className={fieldErrors.firstName ? 'border-destructive' : ''} />
                    {fieldErrors.firstName && <p className="text-xs text-destructive">First name is required</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); setFieldErrors(prev => ({ ...prev, lastName: false })); }} className={fieldErrors.lastName ? 'border-destructive' : ''} />
                    {fieldErrors.lastName && <p className="text-xs text-destructive">Last name is required</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} onBlur={(e) => validateEmail(e.target.value)} placeholder="email@example.com" className={fieldWarnings.email ? 'border-warning' : ''} />
                    {fieldWarnings.email && <p className="text-xs text-warning">{fieldWarnings.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\s]/g, '') })} placeholder="+974 XXXX XXXX" inputMode="tel" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company/Organization *</Label>
                  <Input id="company" value={formData.company} onChange={(e) => { setFormData({ ...formData, company: e.target.value }); setFieldErrors(prev => ({ ...prev, company: false })); }} className={fieldErrors.company ? 'border-destructive' : ''} />
                  {fieldErrors.company && <p className="text-xs text-destructive">Company is required</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role/Job Title *</Label>
                  <Input id="role" value={formData.role} onChange={(e) => { setFormData({ ...formData, role: e.target.value }); setFieldErrors(prev => ({ ...prev, role: false })); }} className={fieldErrors.role ? 'border-destructive' : ''} />
                  {fieldErrors.role && <p className="text-xs text-destructive">Role is required</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessGroup">Access Group *</Label>
                  <Select value={formData.accessGroup} onValueChange={(value) => { setFormData({ ...formData, accessGroup: value }); setFieldErrors(prev => ({ ...prev, accessGroup: false })); }}>
                    <SelectTrigger id="accessGroup" className={fieldErrors.accessGroup ? 'border-destructive' : ''}>
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
                  <Label htmlFor="identificationType">Identification Type *</Label>
                  <Select value={formData.identificationType} onValueChange={(value: 'qid' | 'passport') => setFormData({ ...formData, identificationType: value })}>
                    <SelectTrigger id="identificationType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qid">QID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.identificationType === 'qid' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qidNumber">QID Number *</Label>
                      <Input id="qidNumber" value={formData.qidNumber} onChange={(e) => setFormData({ ...formData, qidNumber: e.target.value.replace(/\D/g, '') })} placeholder="11 digit QID" maxLength={11} inputMode="numeric" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qidExpiry">QID Expiry Date *</Label>
                      <DatePicker value={formData.qidExpiry} onChange={(date) => {
                        const val = date ? toQatarDateString(date) : '';
                        setFormData(prev => ({ ...prev, qidExpiry: val }));
                        validateExpiryDate('qidExpiry', val);
                      }} />
                      {fieldWarnings.qidExpiry && <p className="text-xs text-warning">{fieldWarnings.qidExpiry}</p>}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">Passport Number *</Label>
                        <Input id="passportNumber" value={formData.passportNumber} onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })} placeholder="e.g. AB1234567" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passportCountry">Issuing Country *</Label>
                        <CountryInput id="passportCountry" value={formData.passportCountry} onChange={(v) => setFormData({ ...formData, passportCountry: v })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportExpiry">Passport Expiry Date *</Label>
                      <DatePicker value={formData.passportExpiry} onChange={(date) => {
                        const val = date ? toQatarDateString(date) : '';
                        setFormData(prev => ({ ...prev, passportExpiry: val }));
                        validateExpiryDate('passportExpiry', val);
                      }} />
                      {fieldWarnings.passportExpiry && <p className="text-xs text-warning">{fieldWarnings.passportExpiry}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hayyaNumber">Hayya / Visit Visa Number *</Label>
                        <Input id="hayyaNumber" value={formData.hayyaNumber} onChange={(e) => setFormData({ ...formData, hayyaNumber: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hayyaExpiry">Hayya / Visit Visa Expiry *</Label>
                        <DatePicker value={formData.hayyaExpiry} onChange={(date) => {
                          const val = date ? toQatarDateString(date) : '';
                          setFormData(prev => ({ ...prev, hayyaExpiry: val }));
                          validateExpiryDate('hayyaExpiry', val);
                        }} />
                        {fieldWarnings.hayyaExpiry && <p className="text-xs text-warning">{fieldWarnings.hayyaExpiry}</p>}
                      </div>
                    </div>
                  </>
                )}

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
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          {photoPreview ? 'Change Photo' : 'Choose Photo'}
                        </Button>
                        {photoPreview && (
                          <Button type="button" variant="outline" className="text-destructive" onClick={() => { setPhotoPreview(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                            Remove
                          </Button>
                        )}
                      </div>
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
                <CardDescription>Select phases and optionally narrow the dates within the event's schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bump-In */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bumpIn" checked={formData.hasBumpInAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasBumpInAccess: checked === true })} />
                    <Label htmlFor="bumpIn" className="font-semibold">Bump-In Access</Label>
                    {project?.bumpInStart && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Event: {new Date(project.bumpInStart).toLocaleDateString()} – {new Date(project.bumpInEnd).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {formData.hasBumpInAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bumpInStart">Start Date</Label>
                        <DatePicker value={formData.bumpInStart} minDate={project?.bumpInStart} maxDate={project?.bumpInEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, bumpInStart: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bumpInEnd">End Date</Label>
                        <DatePicker value={formData.bumpInEnd} minDate={project?.bumpInStart} maxDate={project?.bumpInEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, bumpInEnd: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="live" checked={formData.hasLiveAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasLiveAccess: checked === true })} />
                    <Label htmlFor="live" className="font-semibold">Live Access</Label>
                    {project?.liveStart && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Event: {new Date(project.liveStart).toLocaleDateString()} – {new Date(project.liveEnd).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {formData.hasLiveAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="liveStart">Start Date</Label>
                        <DatePicker value={formData.liveStart} minDate={project?.liveStart} maxDate={project?.liveEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, liveStart: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="liveEnd">End Date</Label>
                        <DatePicker value={formData.liveEnd} minDate={project?.liveStart} maxDate={project?.liveEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, liveEnd: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bump-Out */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bumpOut" checked={formData.hasBumpOutAccess} onCheckedChange={(checked) => setFormData({ ...formData, hasBumpOutAccess: checked === true })} />
                    <Label htmlFor="bumpOut" className="font-semibold">Bump-Out Access</Label>
                    {project?.bumpOutStart && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Event: {new Date(project.bumpOutStart).toLocaleDateString()} – {new Date(project.bumpOutEnd).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {formData.hasBumpOutAccess && (
                    <div className="ml-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bumpOutStart">Start Date</Label>
                        <DatePicker value={formData.bumpOutStart} minDate={project?.bumpOutStart} maxDate={project?.bumpOutEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, bumpOutStart: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bumpOutEnd">End Date</Label>
                        <DatePicker value={formData.bumpOutEnd} minDate={project?.bumpOutStart} maxDate={project?.bumpOutEnd} onChange={(date) => {
                          setFormData(prev => ({ ...prev, bumpOutEnd: date ? toQatarDateString(date) : '' }));
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this accreditation..."
                  rows={3}
                />
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
