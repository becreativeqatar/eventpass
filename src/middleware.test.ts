import { NextRequest } from 'next/server';
import { middleware, config } from '@/middleware';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

import { getToken } from 'next-auth/jwt';

const mockedGetToken = vi.mocked(getToken);

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. allows / without auth
  it('allows / without auth', async () => {
    const response = await middleware(createRequest('/'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 2. allows /login without auth
  it('allows /login without auth', async () => {
    const response = await middleware(createRequest('/login'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 3. allows /verify/abc without auth
  it('allows /verify/abc without auth', async () => {
    const response = await middleware(createRequest('/verify/abc'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 4. allows /set-password without auth
  it('allows /set-password without auth', async () => {
    const response = await middleware(createRequest('/set-password'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 5. allows /api/auth/signin (auth API)
  it('allows /api/auth/signin without auth', async () => {
    const response = await middleware(createRequest('/api/auth/signin'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 6. allows /api/verify/token123 (verify API)
  it('allows /api/verify/token123 without auth', async () => {
    const response = await middleware(createRequest('/api/verify/token123'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 7. passes through other API routes like /api/accreditations
  it('passes through other API routes like /api/accreditations', async () => {
    const response = await middleware(createRequest('/api/accreditations'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  // 8. redirects unauthenticated user from /admin to /login
  it('redirects unauthenticated user from /admin to /login', async () => {
    mockedGetToken.mockResolvedValue(null);

    const response = await middleware(createRequest('/admin'));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
  });

  // 9. includes callbackUrl=/admin in redirect URL
  it('includes callbackUrl in redirect URL', async () => {
    mockedGetToken.mockResolvedValue(null);

    const response = await middleware(createRequest('/admin'));

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('callbackUrl')).toBe('/admin');
  });

  // 10. allows authenticated user to access /admin
  it('allows authenticated user to access /admin', async () => {
    mockedGetToken.mockResolvedValue({ sub: 'user-1', name: 'Test' });

    const response = await middleware(createRequest('/admin'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  // config.matcher
  it('exports a matcher that excludes static files', () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
    // The matcher pattern should exclude _next/static, _next/image, favicon.ico
    const pattern = config.matcher[0];
    expect(pattern).toContain('_next/static');
    expect(pattern).toContain('_next/image');
    expect(pattern).toContain('favicon.ico');
  });
});
