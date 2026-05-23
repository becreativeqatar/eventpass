vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomUUID: vi.fn(() => 'mock-uuid-token'),
  };
});

import { prisma } from '@/lib/prisma';
import {
  generatePasswordToken,
  validatePasswordToken,
  consumePasswordToken,
} from '@/lib/tokens';

const mockVerificationToken = vi.mocked(prisma.verificationToken);

describe('generatePasswordToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes existing tokens for the email', async () => {
    mockVerificationToken.create.mockResolvedValue({
      identifier: 'user@test.com',
      token: 'mock-uuid-token',
      expires: new Date(),
    });

    await generatePasswordToken('user@test.com', 24);

    expect(mockVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: 'user@test.com' },
    });
  });

  it('creates a new token with correct expiry', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    mockVerificationToken.create.mockResolvedValue({
      identifier: 'user@test.com',
      token: 'mock-uuid-token',
      expires: new Date(now + 24 * 60 * 60 * 1000),
    });

    await generatePasswordToken('user@test.com', 24);

    expect(mockVerificationToken.create).toHaveBeenCalledWith({
      data: {
        identifier: 'user@test.com',
        token: 'mock-uuid-token',
        expires: new Date(now + 24 * 60 * 60 * 1000),
      },
    });

    vi.restoreAllMocks();
  });

  it('returns the generated token string', async () => {
    mockVerificationToken.create.mockResolvedValue({
      identifier: 'user@test.com',
      token: 'mock-uuid-token',
      expires: new Date(),
    });

    const token = await generatePasswordToken('user@test.com', 24);
    expect(token).toBe('mock-uuid-token');
  });

  it('calls deleteMany before create', async () => {
    const callOrder: string[] = [];
    mockVerificationToken.deleteMany.mockImplementation(async () => {
      callOrder.push('deleteMany');
      return { count: 1 };
    });
    mockVerificationToken.create.mockImplementation(async () => {
      callOrder.push('create');
      return { identifier: 'x', token: 'mock-uuid-token', expires: new Date() };
    });

    await generatePasswordToken('user@test.com', 1);

    expect(callOrder).toEqual(['deleteMany', 'create']);
  });
});

describe('validatePasswordToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when token not found', async () => {
    mockVerificationToken.findUnique.mockResolvedValue(null);

    const result = await validatePasswordToken('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null and deletes token when expired', async () => {
    const expiredDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
    mockVerificationToken.findUnique.mockResolvedValue({
      identifier: 'user@test.com',
      token: 'expired-token',
      expires: expiredDate,
    });

    const result = await validatePasswordToken('expired-token');

    expect(result).toBeNull();
    expect(mockVerificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'expired-token' },
    });
  });

  it('returns identifier (email) when token is valid', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    mockVerificationToken.findUnique.mockResolvedValue({
      identifier: 'valid@test.com',
      token: 'valid-token',
      expires: futureDate,
    });

    const result = await validatePasswordToken('valid-token');
    expect(result).toBe('valid@test.com');
  });

  it('does not delete a valid token', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    mockVerificationToken.findUnique.mockResolvedValue({
      identifier: 'valid@test.com',
      token: 'valid-token',
      expires: futureDate,
    });

    await validatePasswordToken('valid-token');
    expect(mockVerificationToken.delete).not.toHaveBeenCalled();
  });
});

describe('consumePasswordToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the token', async () => {
    mockVerificationToken.delete.mockResolvedValue({
      identifier: 'user@test.com',
      token: 'consume-me',
      expires: new Date(),
    });

    await consumePasswordToken('consume-me');

    expect(mockVerificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'consume-me' },
    });
  });

  it('silently catches if token already consumed', async () => {
    mockVerificationToken.delete.mockRejectedValue(new Error('Record not found'));

    // Should not throw
    await expect(consumePasswordToken('already-gone')).resolves.toBeUndefined();
  });
});
