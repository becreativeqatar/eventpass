import {
  // Constants
  Role,
  ProjectStatus,
  AccreditationStatus,
  ScanResult,
  IdentificationType,
  VALID_PHASES,
  QID_REGEX,
  PASSPORT_REGEX,

  // Schemas
  createProjectSchema,
  updateProjectSchema,
  createAccreditationSchema,
  updateAccreditationSchema,
  quickAddAccreditationSchema,
  approveAccreditationSchema,
  rejectAccreditationSchema,
  revokeAccreditationSchema,
  scanSchema,
  accreditationQuerySchema,
  projectQuerySchema,

  // Helpers
  phasesToString,
  stringToPhases,
  accessGroupsToString,
  stringToAccessGroups,
  validateQID,
  validatePassport,
  isExpired,
  expiresWithinDays,
  getPhases,
} from '@/lib/validations/accreditation';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

/** Sequential dates for a valid active project */
function sequentialDates() {
  return {
    bumpInStart: '2026-06-01T08:00:00Z',
    bumpInEnd: '2026-06-02T08:00:00Z',
    liveStart: '2026-06-03T08:00:00Z',
    liveEnd: '2026-06-04T08:00:00Z',
    bumpOutStart: '2026-06-05T08:00:00Z',
    bumpOutEnd: '2026-06-06T08:00:00Z',
  };
}

/** Minimal valid accreditation input (QID, bump-in only) */
function validAccreditationInput(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 'proj_1',
    firstName: 'Ali',
    lastName: 'Hassan',
    company: 'ACME',
    role: 'Engineer',
    identificationType: 'qid' as const,
    qidNumber: '12345678901',
    qidExpiry: '2027-12-31',
    hasBumpInAccess: true,
    bumpInStart: '2026-06-01T08:00:00Z',
    bumpInEnd: '2026-06-02T08:00:00Z',
    ...overrides,
  };
}

// ===========================================================================
// CONSTANTS
// ===========================================================================

describe('Constants', () => {
  it('Role has correct keys', () => {
    expect(Role).toEqual({
      ADMIN: 'ADMIN',
      MANAGER: 'MANAGER',
      STAFF: 'STAFF',
      VALIDATOR: 'VALIDATOR',
    });
  });

  it('ProjectStatus has correct keys', () => {
    expect(Object.values(ProjectStatus)).toEqual(
      expect.arrayContaining(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']),
    );
  });

  it('AccreditationStatus has correct keys', () => {
    expect(Object.values(AccreditationStatus)).toEqual(
      expect.arrayContaining(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED']),
    );
  });

  it('ScanResult has correct keys', () => {
    expect(Object.values(ScanResult)).toEqual(
      expect.arrayContaining(['ALLOWED', 'DENIED', 'EXPIRED', 'REVOKED', 'WRONG_PHASE', 'ID_EXPIRED']),
    );
  });

  it('IdentificationType has correct keys', () => {
    expect(IdentificationType).toEqual({ QID: 'qid', PASSPORT: 'passport' });
  });

  it('VALID_PHASES contains BUMP_IN, LIVE, BUMP_OUT', () => {
    expect(VALID_PHASES).toEqual(['BUMP_IN', 'LIVE', 'BUMP_OUT']);
  });

  it('QID_REGEX matches 11-digit strings', () => {
    expect(QID_REGEX.test('12345678901')).toBe(true);
    expect(QID_REGEX.test('1234567890')).toBe(false);
    expect(QID_REGEX.test('123456789012')).toBe(false);
    expect(QID_REGEX.test('abcdefghijk')).toBe(false);
  });

  it('PASSPORT_REGEX matches 5-20 alphanumeric strings', () => {
    expect(PASSPORT_REGEX.test('AB123')).toBe(true);
    expect(PASSPORT_REGEX.test('A1B2C3D4E5F6G7H8I9J0')).toBe(true);
    expect(PASSPORT_REGEX.test('AB1')).toBe(false); // too short
    expect(PASSPORT_REGEX.test('AB-12')).toBe(false); // special char
  });
});

// ===========================================================================
// createProjectSchema
// ===========================================================================

describe('createProjectSchema', () => {
  it('accepts valid active project with sequential dates', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Event',
      ...sequentialDates(),
    });
    expect(result.success).toBe(true);
  });

  it('requires name', () => {
    const result = createProjectSchema.safeParse({ ...sequentialDates() });
    expect(result.success).toBe(false);
  });

  it('enforces code max 20 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      code: 'A'.repeat(21),
      ...sequentialDates(),
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to ACTIVE', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      ...sequentialDates(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('ACTIVE');
  });

  it('defaults accessGroups to ["General"]', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      ...sequentialDates(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accessGroups).toEqual(['General']);
  });

  it('requires at least one access group', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      accessGroups: [],
      ...sequentialDates(),
    });
    expect(result.success).toBe(false);
  });

  it('rejects active project without all 6 dates', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      status: 'ACTIVE',
      bumpInStart: '2026-06-01T08:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects active project with non-sequential dates', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      bumpInStart: '2026-06-05T08:00:00Z',
      bumpInEnd: '2026-06-04T08:00:00Z', // before start
      liveStart: '2026-06-06T08:00:00Z',
      liveEnd: '2026-06-07T08:00:00Z',
      bumpOutStart: '2026-06-08T08:00:00Z',
      bumpOutEnd: '2026-06-09T08:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('allows draft project without dates', () => {
    const result = createProjectSchema.safeParse({
      name: 'Draft Event',
      status: 'DRAFT',
    });
    expect(result.success).toBe(true);
  });

  it('allows draft project with partial dates', () => {
    const result = createProjectSchema.safeParse({
      name: 'Draft Event',
      status: 'DRAFT',
      bumpInStart: '2026-06-01T08:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// updateProjectSchema
// ===========================================================================

describe('updateProjectSchema', () => {
  it('accepts partial data (name only)', () => {
    const result = updateProjectSchema.safeParse({ name: 'Renamed' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateProjectSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// createAccreditationSchema
// ===========================================================================

describe('createAccreditationSchema', () => {
  // --- Required fields ---

  it('accepts a valid QID accreditation', () => {
    const result = createAccreditationSchema.safeParse(validAccreditationInput());
    expect(result.success).toBe(true);
  });

  it('requires projectId', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ projectId: '' }),
    );
    expect(result.success).toBe(false);
  });

  it('requires firstName', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ firstName: '' }),
    );
    expect(result.success).toBe(false);
  });

  it('requires lastName', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ lastName: '' }),
    );
    expect(result.success).toBe(false);
  });

  it('requires company', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ company: '' }),
    );
    expect(result.success).toBe(false);
  });

  it('requires role', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ role: '' }),
    );
    expect(result.success).toBe(false);
  });

  // --- QID refinement ---

  it('requires qidNumber when identificationType is qid', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ qidNumber: null }),
    );
    expect(result.success).toBe(false);
  });

  it('requires 11-digit qidNumber', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ qidNumber: '123' }),
    );
    expect(result.success).toBe(false);
  });

  it('requires qidExpiry when identificationType is qid', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ qidExpiry: null }),
    );
    expect(result.success).toBe(false);
  });

  // --- Passport refinement ---

  it('accepts valid passport accreditation', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: 'IN',
        passportExpiry: '2027-12-31',
        hayyaNumber: 'H12345',
        hayyaExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('requires passportNumber when passport selected', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: null,
        passportCountry: 'IN',
        passportExpiry: '2027-12-31',
        hayyaNumber: 'H12345',
        hayyaExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires passportCountry when passport selected', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: null,
        passportExpiry: '2027-12-31',
        hayyaNumber: 'H12345',
        hayyaExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires hayyaNumber when passport selected', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: 'IN',
        passportExpiry: '2027-12-31',
        hayyaNumber: null,
        hayyaExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires hayyaExpiry when passport selected', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: 'IN',
        passportExpiry: '2027-12-31',
        hayyaNumber: 'H12345',
        hayyaExpiry: null,
      }),
    );
    expect(result.success).toBe(false);
  });

  // --- Phase access refinements ---

  it('requires at least one phase to be true', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: false,
        hasLiveAccess: false,
        hasBumpOutAccess: false,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires bumpIn dates when hasBumpInAccess is true', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ bumpInStart: null, bumpInEnd: null }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects bumpIn dates when start >= end', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        bumpInStart: '2026-06-02T08:00:00Z',
        bumpInEnd: '2026-06-01T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires live dates when hasLiveAccess is true', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasLiveAccess: true,
        liveStart: null,
        liveEnd: null,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects live dates when start >= end', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasLiveAccess: true,
        liveStart: '2026-06-04T08:00:00Z',
        liveEnd: '2026-06-03T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires bumpOut dates when hasBumpOutAccess is true', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpOutAccess: true,
        bumpOutStart: null,
        bumpOutEnd: null,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects bumpOut dates when start >= end', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpOutAccess: true,
        bumpOutStart: '2026-06-10T08:00:00Z',
        bumpOutEnd: '2026-06-09T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  // --- Cross-phase overlap refinements ---

  it('rejects when bumpInEnd > liveStart', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: true,
        bumpInStart: '2026-06-01T08:00:00Z',
        bumpInEnd: '2026-06-05T08:00:00Z',
        hasLiveAccess: true,
        liveStart: '2026-06-04T08:00:00Z',
        liveEnd: '2026-06-06T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('allows bumpInEnd == liveStart (boundary)', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: true,
        bumpInStart: '2026-06-01T08:00:00Z',
        bumpInEnd: '2026-06-04T08:00:00Z',
        hasLiveAccess: true,
        liveStart: '2026-06-04T08:00:00Z',
        liveEnd: '2026-06-06T08:00:00Z',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects when liveEnd > bumpOutStart', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasLiveAccess: true,
        liveStart: '2026-06-03T08:00:00Z',
        liveEnd: '2026-06-06T08:00:00Z',
        hasBumpOutAccess: true,
        bumpOutStart: '2026-06-05T08:00:00Z',
        bumpOutEnd: '2026-06-08T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects bumpInEnd > bumpOutStart when live is skipped', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: true,
        bumpInStart: '2026-06-01T08:00:00Z',
        bumpInEnd: '2026-06-10T08:00:00Z',
        hasLiveAccess: false,
        hasBumpOutAccess: true,
        bumpOutStart: '2026-06-08T08:00:00Z',
        bumpOutEnd: '2026-06-12T08:00:00Z',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('allows bumpInEnd <= bumpOutStart when live is skipped', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: true,
        bumpInStart: '2026-06-01T08:00:00Z',
        bumpInEnd: '2026-06-05T08:00:00Z',
        hasLiveAccess: false,
        hasBumpOutAccess: true,
        bumpOutStart: '2026-06-05T08:00:00Z',
        bumpOutEnd: '2026-06-08T08:00:00Z',
      }),
    );
    expect(result.success).toBe(true);
  });

  // --- ID expiry covers phases refinement ---

  it('rejects when QID expires before bumpInEnd', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ qidExpiry: '2026-05-01' }), // expires before phase end
    );
    expect(result.success).toBe(false);
  });

  it('rejects when passport expires before phase end', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: 'IN',
        passportExpiry: '2026-05-01', // too early
        hayyaNumber: 'H12345',
        hayyaExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects when hayya expires before phase end', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        identificationType: 'passport',
        qidNumber: null,
        qidExpiry: null,
        passportNumber: 'AB12345',
        passportCountry: 'IN',
        passportExpiry: '2027-12-31',
        hayyaNumber: 'H12345',
        hayyaExpiry: '2026-05-01', // too early
      }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts when ID expiry covers all phases', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({
        hasBumpInAccess: true,
        bumpInStart: '2026-06-01T08:00:00Z',
        bumpInEnd: '2026-06-02T08:00:00Z',
        hasLiveAccess: true,
        liveStart: '2026-06-03T08:00:00Z',
        liveEnd: '2026-06-04T08:00:00Z',
        hasBumpOutAccess: true,
        bumpOutStart: '2026-06-05T08:00:00Z',
        bumpOutEnd: '2026-06-06T08:00:00Z',
        qidExpiry: '2027-12-31',
      }),
    );
    expect(result.success).toBe(true);
  });

  // --- Optional email ---

  it('allows empty string email', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ email: '' }),
    );
    expect(result.success).toBe(true);
  });

  it('validates email format when provided', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ email: 'not-an-email' }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const result = createAccreditationSchema.safeParse(
      validAccreditationInput({ email: 'ali@example.com' }),
    );
    expect(result.success).toBe(true);
  });

  // --- Defaults ---

  it('defaults status to PENDING', () => {
    const result = createAccreditationSchema.safeParse(validAccreditationInput());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('PENDING');
  });

  it('defaults accessGroup to General', () => {
    const result = createAccreditationSchema.safeParse(validAccreditationInput());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accessGroup).toBe('General');
  });
});

// ===========================================================================
// updateAccreditationSchema
// ===========================================================================

describe('updateAccreditationSchema', () => {
  it('accepts partial updates', () => {
    const result = updateAccreditationSchema.safeParse({ firstName: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('omits projectId', () => {
    const result = updateAccreditationSchema.safeParse({ projectId: 'p1' });
    // projectId should be stripped (omit removes it)
    expect(result.success).toBe(true);
    if (result.success) {
      expect('projectId' in result.data).toBe(false);
    }
  });

  it('accepts empty object', () => {
    const result = updateAccreditationSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// quickAddAccreditationSchema
// ===========================================================================

describe('quickAddAccreditationSchema', () => {
  it('accepts valid quick add', () => {
    const result = quickAddAccreditationSchema.safeParse({
      projectId: 'p1',
      firstName: 'Ali',
      lastName: 'Hassan',
      phases: ['BUMP_IN'],
    });
    expect(result.success).toBe(true);
  });

  it('requires projectId', () => {
    const result = quickAddAccreditationSchema.safeParse({
      firstName: 'Ali',
      lastName: 'Hassan',
      phases: ['LIVE'],
    });
    expect(result.success).toBe(false);
  });

  it('requires firstName', () => {
    const result = quickAddAccreditationSchema.safeParse({
      projectId: 'p1',
      lastName: 'Hassan',
      phases: ['LIVE'],
    });
    expect(result.success).toBe(false);
  });

  it('requires lastName', () => {
    const result = quickAddAccreditationSchema.safeParse({
      projectId: 'p1',
      firstName: 'Ali',
      phases: ['LIVE'],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one phase', () => {
    const result = quickAddAccreditationSchema.safeParse({
      projectId: 'p1',
      firstName: 'Ali',
      lastName: 'Hassan',
      phases: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phase value', () => {
    const result = quickAddAccreditationSchema.safeParse({
      projectId: 'p1',
      firstName: 'Ali',
      lastName: 'Hassan',
      phases: ['INVALID_PHASE'],
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// Status update schemas
// ===========================================================================

describe('approveAccreditationSchema', () => {
  it('accepts without notes', () => {
    const result = approveAccreditationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts with notes', () => {
    const result = approveAccreditationSchema.safeParse({ notes: 'Looks good' });
    expect(result.success).toBe(true);
  });

  it('accepts null notes', () => {
    const result = approveAccreditationSchema.safeParse({ notes: null });
    expect(result.success).toBe(true);
  });
});

describe('rejectAccreditationSchema', () => {
  it('requires notes', () => {
    const result = rejectAccreditationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty notes', () => {
    const result = rejectAccreditationSchema.safeParse({ notes: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid notes', () => {
    const result = rejectAccreditationSchema.safeParse({ notes: 'Missing docs' });
    expect(result.success).toBe(true);
  });
});

describe('revokeAccreditationSchema', () => {
  it('requires reason', () => {
    const result = revokeAccreditationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = revokeAccreditationSchema.safeParse({ reason: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid reason', () => {
    const result = revokeAccreditationSchema.safeParse({ reason: 'Security concern' });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// scanSchema
// ===========================================================================

describe('scanSchema', () => {
  it('accepts valid scan', () => {
    const result = scanSchema.safeParse({
      verificationToken: 'tok_abc',
      phase: 'LIVE',
    });
    expect(result.success).toBe(true);
  });

  it('requires verificationToken', () => {
    const result = scanSchema.safeParse({ phase: 'LIVE' });
    expect(result.success).toBe(false);
  });

  it('rejects empty verificationToken', () => {
    const result = scanSchema.safeParse({ verificationToken: '', phase: 'LIVE' });
    expect(result.success).toBe(false);
  });

  it('requires phase from valid enum', () => {
    const result = scanSchema.safeParse({
      verificationToken: 'tok_abc',
      phase: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional location and notes', () => {
    const result = scanSchema.safeParse({
      verificationToken: 'tok_abc',
      phase: 'BUMP_OUT',
      location: 'Gate A',
      notes: 'VIP',
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// accreditationQuerySchema
// ===========================================================================

describe('accreditationQuerySchema', () => {
  it('applies defaults for empty input', () => {
    const result = accreditationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.p).toBe(1);
      expect(result.data.ps).toBe(20);
      expect(result.data.sort).toBe('createdAt');
      expect(result.data.order).toBe('desc');
    }
  });

  it('coerces string numbers', () => {
    const result = accreditationQuerySchema.safeParse({ p: '3', ps: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.p).toBe(3);
      expect(result.data.ps).toBe(50);
    }
  });

  it('rejects page size > 100', () => {
    const result = accreditationQuerySchema.safeParse({ ps: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects page < 1', () => {
    const result = accreditationQuerySchema.safeParse({ p: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts valid status filter', () => {
    const result = accreditationQuerySchema.safeParse({ status: 'APPROVED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sort field', () => {
    const result = accreditationQuerySchema.safeParse({ sort: 'invalidField' });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// projectQuerySchema
// ===========================================================================

describe('projectQuerySchema', () => {
  it('applies defaults for empty input', () => {
    const result = projectQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.p).toBe(1);
      expect(result.data.ps).toBe(20);
    }
  });

  it('accepts optional status filter', () => {
    const result = projectQuerySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = projectQuerySchema.safeParse({ status: 'NOPE' });
    expect(result.success).toBe(false);
  });

  it('coerces string page number', () => {
    const result = projectQuerySchema.safeParse({ p: '2' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.p).toBe(2);
  });
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

describe('phasesToString', () => {
  it('joins phases with comma', () => {
    expect(phasesToString(['BUMP_IN', 'LIVE'])).toBe('BUMP_IN,LIVE');
  });

  it('returns empty string for empty array', () => {
    expect(phasesToString([])).toBe('');
  });

  it('handles single phase', () => {
    expect(phasesToString(['BUMP_OUT'])).toBe('BUMP_OUT');
  });
});

describe('stringToPhases', () => {
  it('splits comma-separated string into phases', () => {
    expect(stringToPhases('BUMP_IN,LIVE,BUMP_OUT')).toEqual(['BUMP_IN', 'LIVE', 'BUMP_OUT']);
  });

  it('filters out invalid phases', () => {
    expect(stringToPhases('BUMP_IN,INVALID,LIVE')).toEqual(['BUMP_IN', 'LIVE']);
  });

  it('returns empty array for empty string', () => {
    expect(stringToPhases('')).toEqual([]);
  });

  it('handles single phase', () => {
    expect(stringToPhases('LIVE')).toEqual(['LIVE']);
  });
});

describe('accessGroupsToString', () => {
  it('joins groups with comma', () => {
    expect(accessGroupsToString(['General', 'VIP'])).toBe('General,VIP');
  });

  it('returns empty string for empty array', () => {
    expect(accessGroupsToString([])).toBe('');
  });
});

describe('stringToAccessGroups', () => {
  it('splits comma-separated string', () => {
    expect(stringToAccessGroups('General,VIP,Media')).toEqual(['General', 'VIP', 'Media']);
  });

  it('trims whitespace', () => {
    expect(stringToAccessGroups('General , VIP')).toEqual(['General', 'VIP']);
  });

  it('returns ["General"] for empty string', () => {
    expect(stringToAccessGroups('')).toEqual(['General']);
  });

  it('filters out empty segments', () => {
    expect(stringToAccessGroups('General,,VIP')).toEqual(['General', 'VIP']);
  });
});

describe('validateQID', () => {
  it('returns true for valid 11-digit QID', () => {
    expect(validateQID('12345678901')).toBe(true);
  });

  it('returns false for 10-digit string', () => {
    expect(validateQID('1234567890')).toBe(false);
  });

  it('returns false for alphabetic string', () => {
    expect(validateQID('abcdefghijk')).toBe(false);
  });

  it('returns false for 12-digit string', () => {
    expect(validateQID('123456789012')).toBe(false);
  });
});

describe('validatePassport', () => {
  it('returns true for valid alphanumeric 5-20 chars', () => {
    expect(validatePassport('AB12345')).toBe(true);
  });

  it('returns false for too short', () => {
    expect(validatePassport('AB1')).toBe(false);
  });

  it('returns false for too long', () => {
    expect(validatePassport('A'.repeat(21))).toBe(false);
  });

  it('returns false for special characters', () => {
    expect(validatePassport('AB-123')).toBe(false);
  });
});

describe('isExpired', () => {
  it('returns true for past date', () => {
    expect(isExpired(new Date('2020-01-01'))).toBe(true);
  });

  it('returns false for future date', () => {
    expect(isExpired(new Date('2030-01-01'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isExpired(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isExpired(undefined)).toBe(false);
  });

  it('handles string date', () => {
    expect(isExpired('2020-01-01')).toBe(true);
  });

  it('handles future string date', () => {
    expect(isExpired('2030-12-31')).toBe(false);
  });
});

describe('expiresWithinDays', () => {
  it('returns true when date is within the window', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(expiresWithinDays(tomorrow, 7)).toBe(true);
  });

  it('returns false when date is far in the future', () => {
    expect(expiresWithinDays(new Date('2035-01-01'), 30)).toBe(false);
  });

  it('returns false for past dates', () => {
    expect(expiresWithinDays(new Date('2020-01-01'), 30)).toBe(false);
  });

  it('returns false for null', () => {
    expect(expiresWithinDays(null, 30)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(expiresWithinDays(undefined, 30)).toBe(false);
  });

  it('handles string date', () => {
    const soonStr = new Date();
    soonStr.setDate(soonStr.getDate() + 3);
    expect(expiresWithinDays(soonStr.toISOString(), 7)).toBe(true);
  });
});

describe('getPhases', () => {
  it('returns all phases when all true', () => {
    expect(
      getPhases({ hasBumpInAccess: true, hasLiveAccess: true, hasBumpOutAccess: true }),
    ).toEqual(['BUMP_IN', 'LIVE', 'BUMP_OUT']);
  });

  it('returns empty array when all false', () => {
    expect(
      getPhases({ hasBumpInAccess: false, hasLiveAccess: false, hasBumpOutAccess: false }),
    ).toEqual([]);
  });

  it('returns only selected phases', () => {
    expect(getPhases({ hasLiveAccess: true })).toEqual(['LIVE']);
  });

  it('handles empty object', () => {
    expect(getPhases({})).toEqual([]);
  });

  it('returns phases in correct order', () => {
    expect(
      getPhases({ hasBumpOutAccess: true, hasBumpInAccess: true }),
    ).toEqual(['BUMP_IN', 'BUMP_OUT']);
  });
});
