import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/verify', '/set-password'];

  // Check if the path is public
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith('/verify/')
  );

  // API paths that need special handling
  const isApiPath = pathname.startsWith('/api');
  const isAuthApi = pathname.startsWith('/api/auth');
  const isVerifyApi = pathname.startsWith('/api/verify');

  // Allow public API routes
  if (isAuthApi || isVerifyApi) {
    return NextResponse.next();
  }

  // For API routes, let the handler manage authentication
  if (isApiPath) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If not authenticated, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // VALIDATOR can only access /validator (and shared pages like /set-password)
  if (role === 'VALIDATOR' && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/validator', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
