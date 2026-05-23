import { NextRequest } from 'next/server';
import type { RouteContext } from '@/lib/http/handler';

/**
 * Create a mock NextRequest for API route testing.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams } = options;

  let fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;

  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    fullUrl += `?${params.toString()}`;
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, init);
}

/**
 * Create a mock route context with async params (Next.js 16 pattern).
 */
export function createMockContext(
  params: Record<string, string> = {}
): RouteContext {
  return {
    params: Promise.resolve(params),
  };
}

/**
 * Create a mock NextAuth session object.
 */
export function mockSession(
  overrides: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } = {}
) {
  return {
    user: {
      id: overrides.id ?? 'user-1',
      email: overrides.email ?? 'admin@test.com',
      name: overrides.name ?? 'Test Admin',
      role: overrides.role ?? 'ADMIN',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Parse JSON from a NextResponse.
 */
export async function parseJsonResponse<T = unknown>(
  response: Response
): Promise<T> {
  return response.json() as Promise<T>;
}
