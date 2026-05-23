import { vi } from 'vitest';

export const prisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  accreditation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  accreditationProject: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  accreditationHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  accreditationScan: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  verificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  account: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn((arg: unknown) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    }
    return Promise.resolve(arg);
  }),
};
