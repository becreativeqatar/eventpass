import { z } from 'zod';

// Enum-like constants for SQLite compatibility (no native enum support)
export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  VALIDATOR: 'VALIDATOR',
} as const;

export const ProjectStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const AccreditationStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;

export const ScanResult = {
  ALLOWED: 'ALLOWED',
  DENIED: 'DENIED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  WRONG_PHASE: 'WRONG_PHASE',
  ID_EXPIRED: 'ID_EXPIRED',
} as const;

export const IdentificationType = {
  QID: 'qid',
  PASSPORT: 'passport',
} as const;

// Valid phase values
export const VALID_PHASES = ['BUMP_IN', 'LIVE', 'BUMP_OUT'] as const;
export type AccreditationPhase = typeof VALID_PHASES[number];

// Regex patterns
export const QID_REGEX = /^\d{11}$/;
export const PASSPORT_REGEX = /^[A-Za-z0-9]{5,20}$/;

// Helper to parse date strings to Date objects
const dateSchema = z.union([
  z.string().transform((val) => new Date(val)),
  z.date(),
]).optional().nullable();

// Helper to validate date strings
const optionalDateString = z.string()
  .optional()
  .nullable()
  .transform((val) => val || null);

// Project status values for z.enum
const PROJECT_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
const ACCREDITATION_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'] as const;
const ID_TYPES = ['qid', 'passport'] as const;

// =============================================================================
// PROJECT VALIDATIONS
// =============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  code: z.string().max(20, 'Project code must be at most 20 characters').optional().nullable().transform(v => v === '' ? undefined : v),
  description: z.string().optional().nullable().transform(v => v === '' ? undefined : v),
  eventDate: dateSchema,
  venue: z.string().optional().nullable().transform(v => v === '' ? undefined : v),
  status: z.enum(PROJECT_STATUSES).default('ACTIVE'),
  accessGroups: z.array(z.string()).min(1, 'At least one access group is required').default(['General']),

  // Phase dates - optional, but must be sequential if provided
  bumpInStart: dateSchema,
  bumpInEnd: dateSchema,
  liveStart: dateSchema,
  liveEnd: dateSchema,
  bumpOutStart: dateSchema,
  bumpOutEnd: dateSchema,
}).refine((data) => {
  // Skip date validation for draft projects
  if (data.status === 'DRAFT') return true;

  // For active projects, check if dates are provided
  const dates = [
    data.bumpInStart,
    data.bumpInEnd,
    data.liveStart,
    data.liveEnd,
    data.bumpOutStart,
    data.bumpOutEnd,
  ].filter(Boolean) as Date[];

  // If no dates at all, allow it (they can be added later)
  if (dates.length === 0) return true;

  // If some dates provided, all 6 must be provided
  if (dates.length !== 6) {
    return false;
  }

  // Validate sequence
  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i] >= dates[i + 1]) {
      return false;
    }
  }

  return true;
}, {
  message: 'All phase dates are required and must be sequential: Bump-In Start → End → Live Start → End → Bump-Out Start → End',
  path: ['bumpInStart'],
});

export const updateProjectSchema = createProjectSchema.partial();

// =============================================================================
// ACCREDITATION VALIDATIONS
// =============================================================================

export const createAccreditationSchema = z.object({
  // Project
  projectId: z.string().min(1, 'Project is required'),

  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  company: z.string().min(1, 'Company/Organization is required'),
  role: z.string().min(1, 'Job title/Role is required'),
  accessGroup: z.string().min(1, 'Access group is required').default('General'),

  // Identification
  identificationType: z.enum(ID_TYPES).default('qid'),
  qidNumber: z.string().optional().nullable(),
  qidExpiry: optionalDateString,
  passportNumber: z.string().optional().nullable(),
  passportCountry: z.string().optional().nullable(),
  passportExpiry: optionalDateString,
  hayyaNumber: z.string().optional().nullable(),
  hayyaExpiry: optionalDateString,

  // Access control
  status: z.enum(ACCREDITATION_STATUSES).default('PENDING'),

  // Per-accreditation phase access
  hasBumpInAccess: z.boolean().default(false),
  bumpInStart: optionalDateString,
  bumpInEnd: optionalDateString,

  hasLiveAccess: z.boolean().default(false),
  liveStart: optionalDateString,
  liveEnd: optionalDateString,

  hasBumpOutAccess: z.boolean().default(false),
  bumpOutStart: optionalDateString,
  bumpOutEnd: optionalDateString,

  // Legacy phases field (computed from access booleans)
  phases: z.array(z.enum(VALID_PHASES)).optional(),

  // Notes
  notes: z.string().optional().nullable(),
})
// Validate QID format and expiry when QID is selected
.refine((data) => {
  if (data.identificationType === 'qid') {
    if (!data.qidNumber) {
      return false;
    }
    if (!QID_REGEX.test(data.qidNumber)) {
      return false;
    }
    if (!data.qidExpiry) {
      return false;
    }
  }
  return true;
}, {
  message: 'QID Number (11 digits) and Expiry Date are required when using QID',
  path: ['qidNumber'],
})
// Validate Passport fields when passport is selected
.refine((data) => {
  if (data.identificationType === 'passport') {
    if (!data.passportNumber || !PASSPORT_REGEX.test(data.passportNumber)) {
      return false;
    }
    if (!data.passportCountry || !data.passportExpiry) {
      return false;
    }
    if (!data.hayyaNumber || !data.hayyaExpiry) {
      return false;
    }
  }
  return true;
}, {
  message: 'Passport Number, Country, Expiry, Hayya Number and Hayya Expiry are required when using Passport',
  path: ['passportNumber'],
})
// At least one phase must be selected
.refine((data) => {
  return data.hasBumpInAccess || data.hasLiveAccess || data.hasBumpOutAccess;
}, {
  message: 'At least one access phase must be selected',
  path: ['hasBumpInAccess'],
})
// Validate Bump-In dates if access is enabled (skip for DRAFT)
.refine((data) => {
  if (data.status === 'DRAFT') return true;
  if (data.hasBumpInAccess) {
    if (!data.bumpInStart || !data.bumpInEnd) {
      return false;
    }
    if (new Date(data.bumpInStart) >= new Date(data.bumpInEnd)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Bump-In start and end dates are required when Bump-In access is enabled',
  path: ['bumpInStart'],
})
// Validate Live dates if access is enabled (skip for DRAFT)
.refine((data) => {
  if (data.status === 'DRAFT') return true;
  if (data.hasLiveAccess) {
    if (!data.liveStart || !data.liveEnd) {
      return false;
    }
    if (new Date(data.liveStart) >= new Date(data.liveEnd)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Live start and end dates are required when Live access is enabled',
  path: ['liveStart'],
})
// Validate Bump-Out dates if access is enabled (skip for DRAFT)
.refine((data) => {
  if (data.status === 'DRAFT') return true;
  if (data.hasBumpOutAccess) {
    if (!data.bumpOutStart || !data.bumpOutEnd) {
      return false;
    }
    if (new Date(data.bumpOutStart) >= new Date(data.bumpOutEnd)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Bump-Out start and end dates are required when Bump-Out access is enabled',
  path: ['bumpOutStart'],
})
// Validate no overlapping between Bump-In and Live phases
.refine((data) => {
  if (data.hasBumpInAccess && data.hasLiveAccess) {
    if (data.bumpInEnd && data.liveStart) {
      if (new Date(data.bumpInEnd) > new Date(data.liveStart)) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'Bump-In end date must not overlap with Live start date',
  path: ['bumpInEnd'],
})
// Validate no overlapping between Live and Bump-Out phases
.refine((data) => {
  if (data.hasLiveAccess && data.hasBumpOutAccess) {
    if (data.liveEnd && data.bumpOutStart) {
      if (new Date(data.liveEnd) > new Date(data.bumpOutStart)) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'Live end date must not overlap with Bump-Out start date',
  path: ['liveEnd'],
})
// Validate no overlapping between Bump-In and Bump-Out (if Live is skipped)
.refine((data) => {
  if (data.hasBumpInAccess && data.hasBumpOutAccess && !data.hasLiveAccess) {
    if (data.bumpInEnd && data.bumpOutStart) {
      if (new Date(data.bumpInEnd) > new Date(data.bumpOutStart)) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'Bump-In end date must not overlap with Bump-Out start date',
  path: ['bumpInEnd'],
})
// Validate ID expiry covers all assigned phases
.refine((data) => {
  // Get the latest phase end date
  const phaseDates: Date[] = [];
  if (data.hasBumpInAccess && data.bumpInEnd) {
    phaseDates.push(new Date(data.bumpInEnd));
  }
  if (data.hasLiveAccess && data.liveEnd) {
    phaseDates.push(new Date(data.liveEnd));
  }
  if (data.hasBumpOutAccess && data.bumpOutEnd) {
    phaseDates.push(new Date(data.bumpOutEnd));
  }

  if (phaseDates.length === 0) return true;

  const latestPhaseEnd = new Date(Math.max(...phaseDates.map(d => d.getTime())));

  // Check ID expiry based on type
  if (data.identificationType === 'qid' && data.qidExpiry) {
    const expiryDate = new Date(data.qidExpiry);
    if (expiryDate < latestPhaseEnd) {
      return false;
    }
  } else if (data.identificationType === 'passport') {
    // Check both passport and hayya expiry
    if (data.passportExpiry) {
      const passportExp = new Date(data.passportExpiry);
      if (passportExp < latestPhaseEnd) {
        return false;
      }
    }
    if (data.hayyaExpiry) {
      const hayyaExp = new Date(data.hayyaExpiry);
      if (hayyaExp < latestPhaseEnd) {
        return false;
      }
    }
  }

  return true;
}, {
  message: 'ID document must be valid until the end of all assigned phases',
  path: ['qidExpiry'],
});

export const updateAccreditationSchema = createAccreditationSchema.partial().omit({ projectId: true });

// Simplified schema for quick add (without full validation)
export const quickAddAccreditationSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  phases: z.array(z.enum(VALID_PHASES)).min(1, 'At least one phase must be selected'),
});

// =============================================================================
// STATUS UPDATE SCHEMAS
// =============================================================================

export const updateStatusSchema = z.object({
  status: z.enum(ACCREDITATION_STATUSES),
  notes: z.string().optional().nullable(),
});

export const approveAccreditationSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const rejectAccreditationSchema = z.object({
  notes: z.string().min(1, 'Rejection reason is required'),
});

export const revokeAccreditationSchema = z.object({
  reason: z.string().min(1, 'Revocation reason is required'),
});

// =============================================================================
// SCAN SCHEMAS
// =============================================================================

export const scanSchema = z.object({
  verificationToken: z.string().min(1, 'Verification token is required'),
  phase: z.enum(VALID_PHASES),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const accreditationQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(ACCREDITATION_STATUSES).optional(),
  q: z.string().optional(), // Search query
  p: z.coerce.number().min(1).default(1), // Page number
  ps: z.coerce.number().min(1).max(100).default(20), // Page size
  sort: z.enum(['firstName', 'lastName', 'company', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const projectQuerySchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  q: z.string().optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper functions for phases conversion
export function phasesToString(phases: AccreditationPhase[]): string {
  return phases.join(',');
}

export function stringToPhases(phasesStr: string): AccreditationPhase[] {
  if (!phasesStr) return [];
  return phasesStr.split(',').filter((p): p is AccreditationPhase =>
    VALID_PHASES.includes(p as AccreditationPhase)
  );
}

// Access groups helpers
export function accessGroupsToString(groups: string[]): string {
  return groups.join(',');
}

export function stringToAccessGroups(groupsStr: string): string[] {
  if (!groupsStr) return ['General'];
  return groupsStr.split(',').map(g => g.trim()).filter(Boolean);
}

// Validate QID format
export function validateQID(qid: string): boolean {
  return QID_REGEX.test(qid);
}

// Validate passport format
export function validatePassport(passport: string): boolean {
  return PASSPORT_REGEX.test(passport);
}

// Check if a date is expired
export function isExpired(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

// Check if date expires within N days
export function expiresWithinDays(date: Date | string | null | undefined, days: number): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);
  return d <= warningDate && d >= new Date();
}

// Get phases from access booleans
export function getPhases(data: {
  hasBumpInAccess?: boolean;
  hasLiveAccess?: boolean;
  hasBumpOutAccess?: boolean;
}): AccreditationPhase[] {
  const phases: AccreditationPhase[] = [];
  if (data.hasBumpInAccess) phases.push('BUMP_IN');
  if (data.hasLiveAccess) phases.push('LIVE');
  if (data.hasBumpOutAccess) phases.push('BUMP_OUT');
  return phases;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type CreateAccreditationRequest = z.infer<typeof createAccreditationSchema>;
export type UpdateAccreditationRequest = z.infer<typeof updateAccreditationSchema>;
export type QuickAddAccreditationRequest = z.infer<typeof quickAddAccreditationSchema>;
export type UpdateStatusRequest = z.infer<typeof updateStatusSchema>;
export type ApproveAccreditationRequest = z.infer<typeof approveAccreditationSchema>;
export type RejectAccreditationRequest = z.infer<typeof rejectAccreditationSchema>;
export type RevokeAccreditationRequest = z.infer<typeof revokeAccreditationSchema>;
export type ScanRequest = z.infer<typeof scanSchema>;
export type AccreditationQuery = z.infer<typeof accreditationQuerySchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
