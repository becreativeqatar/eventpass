/**
 * Test data factories for consistent fixture creation.
 * Each factory returns a plain object matching the Prisma model shape.
 */

let userCounter = 0;
let projectCounter = 0;
let accreditationCounter = 0;
let scanCounter = 0;
let historyCounter = 0;

export function resetCounters() {
  userCounter = 0;
  projectCounter = 0;
  accreditationCounter = 0;
  scanCounter = 0;
  historyCounter = 0;
}

export function buildUser(overrides: Record<string, unknown> = {}) {
  userCounter++;
  return {
    id: `user-${userCounter}`,
    name: `User ${userCounter}`,
    email: `user${userCounter}@test.com`,
    passwordHash: '$2b$12$hashedpassword',
    emailVerified: new Date(),
    image: null,
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildProject(overrides: Record<string, unknown> = {}) {
  projectCounter++;
  const now = new Date();
  const baseDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

  return {
    id: `project-${projectCounter}`,
    name: `Test Project ${projectCounter}`,
    code: `TP${projectCounter}`,
    description: `Test project ${projectCounter} description`,
    eventDate: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000),
    venue: 'Test Venue',
    status: 'ACTIVE',
    accessGroups: 'General,VIP,Media',
    bumpInStart: new Date(baseDate.getTime()),
    bumpInEnd: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
    liveStart: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
    liveEnd: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000),
    bumpOutStart: new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000),
    bumpOutEnd: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
    createdById: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildAccreditation(overrides: Record<string, unknown> = {}) {
  accreditationCounter++;
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

  return {
    id: `acc-${accreditationCounter}`,
    accreditationNumber: `ACC-${String(accreditationCounter).padStart(4, '0')}`,
    projectId: 'project-1',
    firstName: `First${accreditationCounter}`,
    lastName: `Last${accreditationCounter}`,
    email: `person${accreditationCounter}@test.com`,
    phone: '+97412345678',
    company: 'Test Company',
    role: 'Staff',
    accessGroup: 'General',
    identificationType: 'qid',
    qidNumber: '12345678901',
    qidExpiry: futureDate,
    passportNumber: null,
    passportCountry: null,
    passportExpiry: null,
    hayyaNumber: null,
    hayyaExpiry: null,
    status: 'PENDING',
    phases: 'BUMP_IN,LIVE,BUMP_OUT',
    hasBumpInAccess: true,
    bumpInStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    bumpInEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    hasLiveAccess: true,
    liveStart: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    liveEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    hasBumpOutAccess: true,
    bumpOutStart: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
    bumpOutEnd: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    verificationToken: `token-${accreditationCounter}`,
    photoUrl: null,
    notes: null,
    approvedById: null,
    approvedAt: null,
    revokedById: null,
    revokedAt: null,
    revokeReason: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildScan(overrides: Record<string, unknown> = {}) {
  scanCounter++;
  return {
    id: `scan-${scanCounter}`,
    accreditationId: 'acc-1',
    scannedById: 'user-1',
    phase: 'LIVE',
    location: 'Main Gate',
    result: 'ALLOWED',
    notes: null,
    device: 'Mozilla/5.0',
    ipAddress: '192.168.1.1',
    scannedAt: new Date(),
    ...overrides,
  };
}

export function buildHistory(overrides: Record<string, unknown> = {}) {
  historyCounter++;
  return {
    id: `history-${historyCounter}`,
    accreditationId: 'acc-1',
    action: 'CREATED',
    oldStatus: null,
    newStatus: 'PENDING',
    notes: null,
    performedById: 'user-1',
    performedAt: new Date(),
    ...overrides,
  };
}
