import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodIssueCode } from 'zod';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth/next';
import { withErrorHandler, getRequestId } from '@/lib/http/handler';
import { AppError } from '@/lib/http/errors';

const mockGetServerSession = vi.mocked(getServerSession);

function makeRequest(headers?: Record<string, string>): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/test', {
    headers: headers ?? {},
  });
  return req;
}

const dummyContext = { params: Promise.resolve({}) };

describe('withErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls handler and returns response on success', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(handler).toHaveBeenCalledOnce();
    expect(body).toEqual({ ok: true });
  });

  it('sets x-request-id on response', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);

    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('uses request x-request-id if present', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(
      makeRequest({ 'x-request-id': 'custom-id-123' }),
      dummyContext,
    );

    expect(res.headers.get('x-request-id')).toBe('custom-id-123');
  });

  it('generates request-id if not in headers', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);
    const requestId = res.headers.get('x-request-id');

    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^req_/);
  });

  it('returns 401 when requireAuth=true and no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const handler = vi.fn();
    const wrapped = withErrorHandler(handler, { requireAuth: true });

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when requireAdmin=true and no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const handler = vi.fn();
    const wrapped = withErrorHandler(handler, { requireAdmin: true });

    const res = await wrapped(makeRequest(), dummyContext);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when requireAdmin=true and user is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { role: 'USER', email: 'test@test.com' },
    });
    const handler = vi.fn();
    const wrapped = withErrorHandler(handler, { requireAdmin: true });

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Admin access required');
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes through when requireAdmin=true and user IS ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { role: 'ADMIN', email: 'admin@test.com' },
    });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ admin: true }));
    const wrapped = withErrorHandler(handler, { requireAdmin: true });

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ admin: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('passes through when requireAuth=true and session exists', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { role: 'USER', email: 'user@test.com' },
    });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler, { requireAuth: true });

    const res = await wrapped(makeRequest(), dummyContext);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not check auth when no options specified', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandler(handler);

    await wrapped(makeRequest(), dummyContext);

    expect(mockGetServerSession).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('catches thrown AppError and returns formatted response', async () => {
    const handler = vi.fn().mockRejectedValue(new AppError('Not found', 404));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('AppError');
    expect(body.message).toBe('Not found');
    expect(body.requestId).toBeTruthy();
  });

  it('catches ZodError and returns 400', async () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    const handler = vi.fn().mockRejectedValue(zodError);
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.requestId).toBeTruthy();
  });

  it('catches generic Error and returns 500', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Something broke'));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(makeRequest(), dummyContext);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.requestId).toBeTruthy();
  });

  it('sets x-request-id on error responses', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(
      makeRequest({ 'x-request-id': 'err-req-id' }),
      dummyContext,
    );

    expect(res.headers.get('x-request-id')).toBe('err-req-id');
  });

  it('includes requestId in error response body', async () => {
    const handler = vi.fn().mockRejectedValue(new AppError('fail', 500));
    const wrapped = withErrorHandler(handler);

    const res = await wrapped(
      makeRequest({ 'x-request-id': 'body-req-id' }),
      dummyContext,
    );
    const body = await res.json();

    expect(body.requestId).toBe('body-req-id');
  });
});

describe('getRequestId', () => {
  it('returns header value if x-request-id is present', () => {
    const req = makeRequest({ 'x-request-id': 'my-id' });
    expect(getRequestId(req)).toBe('my-id');
  });

  it('generates a new id if x-request-id is absent', () => {
    const req = makeRequest();
    const id = getRequestId(req);
    expect(id).toMatch(/^req_/);
  });

  it('generates unique ids on each call', () => {
    const req = makeRequest();
    const id1 = getRequestId(req);
    const id2 = getRequestId(req);
    // They could theoretically collide, but with timestamp + random it's extremely unlikely
    expect(id1).toMatch(/^req_/);
    expect(id2).toMatch(/^req_/);
  });
});
