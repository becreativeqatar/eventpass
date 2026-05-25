import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

import { authOptions } from './auth';
import { prisma } from './prisma';
import { compare } from 'bcryptjs';

const mockPrisma = vi.mocked(prisma);
const mockCompare = vi.mocked(compare);

beforeEach(() => {
  vi.clearAllMocks();
});

// Extract callbacks for direct testing
const credentialsProvider = authOptions.providers[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authorize = (credentialsProvider as any).options.authorize;
const { jwt, session, redirect } = authOptions.callbacks!;

describe('authorize callback', () => {
  it('returns null when credentials are missing', async () => {
    expect(await authorize(null)).toBeNull();
    expect(await authorize(undefined)).toBeNull();
    expect(await authorize({ email: '', password: '' })).toBeNull();
    expect(await authorize({ email: 'a@b.com', password: '' })).toBeNull();
    expect(await authorize({ email: '', password: 'pass' })).toBeNull();
  });

  it('returns null when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const result = await authorize({ email: 'nobody@test.com', password: 'pass123' });

    expect(result).toBeNull();
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nobody@test.com' },
    });
  });

  it('returns null when user has no passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      role: 'ADMIN',
      passwordHash: null,
    } as never);

    const result = await authorize({ email: 'test@test.com', password: 'pass123' });
    expect(result).toBeNull();
  });

  it('returns null when password is invalid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test',
      role: 'ADMIN',
      passwordHash: '$2b$12$hashed',
    } as never);
    mockCompare.mockResolvedValue(false as never);

    const result = await authorize({ email: 'test@test.com', password: 'wrongpass' });

    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith('wrongpass', '$2b$12$hashed');
  });

  it('returns user object when credentials are valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash: '$2b$12$hashed',
    } as never);
    mockCompare.mockResolvedValue(true as never);

    const result = await authorize({ email: 'Admin@Test.com', password: 'correct' });

    expect(result).toEqual({
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN',
    });
    // Email should be lowercased for lookup
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@test.com' },
    });
  });
});

describe('jwt callback', () => {
  it('sets token fields from user on initial sign-in', async () => {
    const token = { sub: 'user-1' };
    const user = { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'ADMIN' };

    const result = await jwt!({
      token,
      user,
      account: null,
      trigger: 'signIn',
    } as Parameters<NonNullable<typeof jwt>>[0]);

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('a@b.com');
    expect(result.name).toBe('Test');
    expect(result.role).toBe('ADMIN');
  });

  it('refreshes role from DB when token.role is missing', async () => {
    const token = { sub: 'user-1', email: 'a@b.com', role: undefined, id: undefined };

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'DB User',
      role: 'MANAGER',
    } as never);

    const result = await jwt!({
      token,
      user: undefined as never,
      account: null,
      trigger: 'update',
    } as Parameters<NonNullable<typeof jwt>>[0]);

    expect(result.id).toBe('user-1');
    expect(result.role).toBe('MANAGER');
    expect(result.name).toBe('DB User');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
    });
  });

  it('does not refresh from DB when role and id are present', async () => {
    const token = { sub: 'user-1', email: 'a@b.com', role: 'ADMIN', id: 'user-1', name: 'Test' };

    const result = await jwt!({
      token,
      user: undefined as never,
      account: null,
      trigger: 'update',
    } as Parameters<NonNullable<typeof jwt>>[0]);

    expect(result.role).toBe('ADMIN');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('handles DB user not found during refresh', async () => {
    const token = { sub: 'user-1', email: 'a@b.com', role: undefined, id: undefined };
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const result = await jwt!({
      token,
      user: undefined as never,
      account: null,
      trigger: 'update',
    } as Parameters<NonNullable<typeof jwt>>[0]);

    expect(result.id).toBeUndefined();
    expect(result.role).toBeUndefined();
  });
});

describe('session callback', () => {
  it('maps token fields to session.user', async () => {
    const sessionObj = {
      user: { id: '', email: '', name: '', role: '' },
      expires: new Date().toISOString(),
    };
    const token = {
      id: 'user-1',
      email: 'a@b.com',
      name: 'Test',
      role: 'ADMIN',
      sub: 'user-1',
    };

    const result = await session!({
      session: sessionObj,
      token,
      trigger: 'update',
      newSession: undefined,
    } as Parameters<NonNullable<typeof session>>[0]);

    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('a@b.com');
    expect(result.user.name).toBe('Test');
    expect(result.user.role).toBe('ADMIN');
  });
});

describe('redirect callback', () => {
  const baseUrl = 'http://localhost:3000';

  it('prepends baseUrl to relative URLs', async () => {
    const result = await redirect!({ url: '/dashboard', baseUrl });
    expect(result).toBe('http://localhost:3000/dashboard');
  });

  it('returns same-origin URLs as-is', async () => {
    const result = await redirect!({ url: 'http://localhost:3000/admin', baseUrl });
    expect(result).toBe('http://localhost:3000/admin');
  });

  it('returns baseUrl for external URLs', async () => {
    const result = await redirect!({ url: 'https://evil.com/phish', baseUrl });
    expect(result).toBe(baseUrl);
  });
});
