'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  User,
  CreditCard,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createAccreditationSchema,
  AccreditationStatus,
  IdentificationType,
} from '@/lib/validations/accreditation';

interface Project {
  id: string;
  name: string;
  accessGroups?: string;
  bumpInStart?: string | null;
  bumpInEnd?: string | null;
  liveStart?: string | null;
  liveEnd?: string | null;
  bumpOutStart?: string | null;
  bumpOutEnd?: string | null;
}

interface AccreditationFormProps {
  projectId: string;
  project?: Project;
  accreditation?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    accessGroup?: string | null;
    status: string;
    phases: string[];
    notes?: string | null;
    identificationType?: string;
    qidNumber?: string | null;
    qidExpiry?: string | null;
    passportNumber?: string | null;
    passportCountry?: string | null;
    passportExpiry?: string | null;
    hayyaNumber?: string | null;
    hayyaExpiry?: string | null;
    hasBumpInAccess?: boolean;
    bumpInStart?: string | null;
    bumpInEnd?: string | null;
    hasLiveAccess?: boolean;
    liveStart?: string | null;
    liveEnd?: string | null;
    hasBumpOutAccess?: boolean;
    bumpOutStart?: string | null;
    bumpOutEnd?: string | null;
  };
  mode: 'create' | 'edit';
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

const STEPS = [
  { id: 0, label: 'Personal Info', icon: User },
  { id: 1, label: 'Identification', icon: CreditCard },
  { id: 2, label: 'Access Control', icon: ShieldCheck },
  { id: 3, label: 'Review', icon: FileCheck },
] as const;

export function AccreditationForm({ projectId, project, accreditation, mode }: AccreditationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idType, setIdType] = useState<string>(accreditation?.identificationType || 'qid');
  const [currentStep, setCurrentStep] = useState(0);

  const isEdit = mode === 'edit';

  const availableAccessGroups = project?.accessGroups
    ? project.accessGroups.split(',').map(g => g.trim()).filter(Boolean)
    : ['General'];

  const [hasBumpInAccess, setHasBumpInAccess] = useState(accreditation?.hasBumpInAccess ?? false);
  const [hasLiveAccess, setHasLiveAccess] = useState(accreditation?.hasLiveAccess ?? true);
  const [hasBumpOutAccess, setHasBumpOutAccess] = useState(accreditation?.hasBumpOutAccess ?? false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createAccreditationSchema),
    defaultValues: {
      projectId,
      firstName: accreditation?.firstName || '',
      lastName: accreditation?.lastName || '',
      email: accreditation?.email || '',
      phone: accreditation?.phone || '+974 ',
      company: accreditation?.company || '',
      role: accreditation?.role || '',
      accessGroup: accreditation?.accessGroup || availableAccessGroups[0] || 'General',
      status: (accreditation?.status || 'PENDING') as keyof typeof AccreditationStatus,
      notes: accreditation?.notes || '',
      identificationType: (accreditation?.identificationType || 'qid') as 'qid' | 'passport',
      qidNumber: accreditation?.qidNumber || '',
      qidExpiry: formatDateForInput(accreditation?.qidExpiry) || '',
      passportNumber: accreditation?.passportNumber || '',
      passportCountry: accreditation?.passportCountry || '',
      passportExpiry: formatDateForInput(accreditation?.passportExpiry) || '',
      hayyaNumber: accreditation?.hayyaNumber || '',
      hayyaExpiry: formatDateForInput(accreditation?.hayyaExpiry) || '',
      hasBumpInAccess: accreditation?.hasBumpInAccess ?? false,
      bumpInStart: formatDateForInput(accreditation?.bumpInStart) || formatDateForInput(project?.bumpInStart) || '',
      bumpInEnd: formatDateForInput(accreditation?.bumpInEnd) || formatDateForInput(project?.bumpInEnd) || '',
      hasLiveAccess: accreditation?.hasLiveAccess ?? true,
      liveStart: formatDateForInput(accreditation?.liveStart) || formatDateForInput(project?.liveStart) || '',
      liveEnd: formatDateForInput(accreditation?.liveEnd) || formatDateForInput(project?.liveEnd) || '',
      hasBumpOutAccess: accreditation?.hasBumpOutAccess ?? false,
      bumpOutStart: formatDateForInput(accreditation?.bumpOutStart) || formatDateForInput(project?.bumpOutStart) || '',
      bumpOutEnd: formatDateForInput(accreditation?.bumpOutEnd) || formatDateForInput(project?.bumpOutEnd) || '',
    },
  });

  const status = watch('status');
  const watchedValues = watch();

  useEffect(() => {
    setValue('hasBumpInAccess', hasBumpInAccess);
    setValue('hasLiveAccess', hasLiveAccess);
    setValue('hasBumpOutAccess', hasBumpOutAccess);
  }, [hasBumpInAccess, hasLiveAccess, hasBumpOutAccess, setValue]);

  useEffect(() => {
    setValue('identificationType', idType as 'qid' | 'passport');
  }, [idType, setValue]);

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = mode === 'create'
        ? '/api/accreditations'
        : `/api/accreditations/${accreditation?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details?.[0]?.message || 'Failed to save accreditation');
      }

      toast.success(mode === 'create' ? 'Accreditation created' : 'Changes saved');
      router.push('/admin/records');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAtLeastOnePhase = hasBumpInAccess || hasLiveAccess || hasBumpOutAccess;

  // Step validation fields
  const stepFields: Record<number, string[]> = {
    0: ['firstName', 'lastName'],
    1: idType === 'qid' ? ['qidNumber'] : ['passportNumber', 'passportCountry'],
    2: [],
    3: [],
  };

  const goNext = async () => {
    const fields = stepFields[currentStep];
    if (fields.length > 0) {
      const valid = await trigger(fields as Parameters<typeof trigger>[0]);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error('Please fill in all required fields'))} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stepper */}
      <nav aria-label="Form steps" className="mb-2">
        <ol className="flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isComplete = idx < currentStep;
            const StepIcon = step.icon;
            return (
              <li key={step.id} className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (idx < currentStep || isEdit) setCurrentStep(idx);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors w-full',
                    isActive && 'border-primary bg-primary/5 text-primary',
                    isComplete && 'border-success/30 bg-success/5 text-success',
                    !isActive && !isComplete && 'border-border text-muted-foreground',
                    (idx < currentStep || isEdit) && 'cursor-pointer hover:bg-muted/50',
                    idx > currentStep && !isEdit && 'cursor-default',
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-success text-success-foreground',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground',
                  )}>
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Personal Information */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register('firstName')} placeholder="Enter first name" />
                {errors.firstName && <p className="text-sm text-destructive">{String(errors.firstName.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register('lastName')} placeholder="Enter last name" />
                {errors.lastName && <p className="text-sm text-destructive">{String(errors.lastName.message)}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="email@example.com" />
                {errors.email && <p className="text-sm text-destructive">{String(errors.email.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} placeholder="+974 XXXX XXXX" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company / Organization *</Label>
                <Input id="company" {...register('company')} placeholder="Company name" />
                {errors.company && <p className="text-sm text-destructive">{String(errors.company.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Position *</Label>
                <Input id="role" {...register('role')} placeholder="e.g., Photographer, Crew, VIP" />
                {errors.role && <p className="text-sm text-destructive">{String(errors.role.message)}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access Group *</Label>
              <Select
                value={watchedValues.accessGroup || availableAccessGroups[0] || 'General'}
                onValueChange={(value) => setValue('accessGroup', value)}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select access group" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccessGroups.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Access groups are defined at the project level</p>
              {errors.accessGroup && <p className="text-sm text-destructive">{String(errors.accessGroup.message)}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Identification */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
            <CardDescription>Provide either Qatar ID (QID) or Passport with Hayya visa details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID Type *</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qid">Qatar ID (QID)</SelectItem>
                  <SelectItem value="passport">Passport + Hayya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {idType === 'qid' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="qidNumber">QID Number *</Label>
                  <Input id="qidNumber" {...register('qidNumber')} placeholder="11-digit QID number" maxLength={11} />
                  <p className="text-xs text-muted-foreground">Must be exactly 11 digits</p>
                  {errors.qidNumber && <p className="text-sm text-destructive">{String(errors.qidNumber.message)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qidExpiry">QID Expiry Date *</Label>
                  <DatePicker
                    id="qidExpiry"
                    value={watchedValues.qidExpiry}
                    onChange={(date) => setValue('qidExpiry', date?.toISOString().split('T')[0] ?? '')}
                  />
                  {errors.qidExpiry && <p className="text-sm text-destructive">{String(errors.qidExpiry.message)}</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">Passport Number *</Label>
                    <Input id="passportNumber" {...register('passportNumber')} placeholder="Passport number" />
                    {errors.passportNumber && <p className="text-sm text-destructive">{String(errors.passportNumber.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportCountry">Issuing Country *</Label>
                    <Input id="passportCountry" {...register('passportCountry')} placeholder="e.g., United Kingdom" />
                    {errors.passportCountry && <p className="text-sm text-destructive">{String(errors.passportCountry.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportExpiry">Passport Expiry *</Label>
                    <DatePicker
                      id="passportExpiry"
                      value={watchedValues.passportExpiry}
                      onChange={(date) => setValue('passportExpiry', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.passportExpiry && <p className="text-sm text-destructive">{String(errors.passportExpiry.message)}</p>}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hayyaNumber">Hayya Visa Number *</Label>
                    <Input id="hayyaNumber" {...register('hayyaNumber')} placeholder="Hayya visa number" />
                    {errors.hayyaNumber && <p className="text-sm text-destructive">{String(errors.hayyaNumber.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hayyaExpiry">Hayya Expiry Date *</Label>
                    <DatePicker
                      id="hayyaExpiry"
                      value={watchedValues.hayyaExpiry}
                      onChange={(date) => setValue('hayyaExpiry', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.hayyaExpiry && <p className="text-sm text-destructive">{String(errors.hayyaExpiry.message)}</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Access Control */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Select which event phases this person can access and their validity dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as keyof typeof AccreditationStatus)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!hasAtLeastOnePhase && (
              <Alert variant="destructive">
                <AlertDescription>At least one access phase must be selected</AlertDescription>
              </Alert>
            )}

            {/* Bump-In Access */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="hasBumpInAccess" checked={hasBumpInAccess} onCheckedChange={(checked) => setHasBumpInAccess(!!checked)} />
                <Label htmlFor="hasBumpInAccess" className="text-base font-medium cursor-pointer">Bump-In Access</Label>
              </div>
              {hasBumpInAccess && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="bumpInStart">Start Date *</Label>
                    <DatePicker
                      id="bumpInStart"
                      value={watchedValues.bumpInStart}
                      onChange={(date) => setValue('bumpInStart', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.bumpInStart && <p className="text-sm text-destructive">{String(errors.bumpInStart.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpInEnd">End Date *</Label>
                    <DatePicker
                      id="bumpInEnd"
                      value={watchedValues.bumpInEnd}
                      onChange={(date) => setValue('bumpInEnd', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.bumpInEnd && <p className="text-sm text-destructive">{String(errors.bumpInEnd.message)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Live Access */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="hasLiveAccess" checked={hasLiveAccess} onCheckedChange={(checked) => setHasLiveAccess(!!checked)} />
                <Label htmlFor="hasLiveAccess" className="text-base font-medium cursor-pointer">Live Event Access</Label>
              </div>
              {hasLiveAccess && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="liveStart">Start Date *</Label>
                    <DatePicker
                      id="liveStart"
                      value={watchedValues.liveStart}
                      onChange={(date) => setValue('liveStart', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.liveStart && <p className="text-sm text-destructive">{String(errors.liveStart.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="liveEnd">End Date *</Label>
                    <DatePicker
                      id="liveEnd"
                      value={watchedValues.liveEnd}
                      onChange={(date) => setValue('liveEnd', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.liveEnd && <p className="text-sm text-destructive">{String(errors.liveEnd.message)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Bump-Out Access */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="hasBumpOutAccess" checked={hasBumpOutAccess} onCheckedChange={(checked) => setHasBumpOutAccess(!!checked)} />
                <Label htmlFor="hasBumpOutAccess" className="text-base font-medium cursor-pointer">Bump-Out Access</Label>
              </div>
              {hasBumpOutAccess && (
                <div className="grid gap-4 md:grid-cols-2 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutStart">Start Date *</Label>
                    <DatePicker
                      id="bumpOutStart"
                      value={watchedValues.bumpOutStart}
                      onChange={(date) => setValue('bumpOutStart', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.bumpOutStart && <p className="text-sm text-destructive">{String(errors.bumpOutStart.message)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bumpOutEnd">End Date *</Label>
                    <DatePicker
                      id="bumpOutEnd"
                      value={watchedValues.bumpOutEnd}
                      onChange={(date) => setValue('bumpOutEnd', date?.toISOString().split('T')[0] ?? '')}
                    />
                    {errors.bumpOutEnd && <p className="text-sm text-destructive">{String(errors.bumpOutEnd.message)}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea {...register('notes')} placeholder="Additional notes about this accreditation..." rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review &amp; Submit</CardTitle>
            <CardDescription>Verify the information before {mode === 'create' ? 'creating' : 'saving'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Personal Info</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{watchedValues.firstName} {watchedValues.lastName}</dd>
                  </div>
                  {watchedValues.email && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>{watchedValues.email}</dd>
                    </div>
                  )}
                  {watchedValues.phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd>{watchedValues.phone}</dd>
                    </div>
                  )}
                  {watchedValues.company && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Company</dt>
                      <dd>{watchedValues.company}</dd>
                    </div>
                  )}
                  {watchedValues.role && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Role</dt>
                      <dd>{watchedValues.role}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Access Group</dt>
                    <dd>{watchedValues.accessGroup}</dd>
                  </div>
                </dl>
              </div>

              {/* Identification */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Identification</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ID Type</dt>
                    <dd className="font-medium">{idType === 'qid' ? 'Qatar ID' : 'Passport + Hayya'}</dd>
                  </div>
                  {idType === 'qid' ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">QID Number</dt>
                        <dd>{watchedValues.qidNumber || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">QID Expiry</dt>
                        <dd>{watchedValues.qidExpiry || '-'}</dd>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Passport</dt>
                        <dd>{watchedValues.passportNumber || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Country</dt>
                        <dd>{watchedValues.passportCountry || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Hayya</dt>
                        <dd>{watchedValues.hayyaNumber || '-'}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Access Control */}
              <div className="space-y-3 md:col-span-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Access Control</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">{watchedValues.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Phases</dt>
                    <dd className="flex gap-1">
                      {hasBumpInAccess && <span className="px-2 py-0.5 rounded bg-muted text-xs">Bump-In</span>}
                      {hasLiveAccess && <span className="px-2 py-0.5 rounded bg-muted text-xs">Live</span>}
                      {hasBumpOutAccess && <span className="px-2 py-0.5 rounded bg-muted text-xs">Bump-Out</span>}
                    </dd>
                  </div>
                  {watchedValues.notes && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="max-w-xs text-right">{watchedValues.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          {currentStep < 3 ? (
            <Button type="button" onClick={goNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || !hasAtLeastOnePhase}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'create' ? 'Create Accreditation' : 'Save Changes'
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
