import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { formatError } from './errors';

export type RouteContext = {
  params?: Record<string, string | string[] | undefined>;
};

export type APIHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

export interface HandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function withErrorHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): APIHandler {
  return async (request: NextRequest, context: RouteContext = {}) => {
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    try {
      // Authentication check
      if (options.requireAuth || options.requireAdmin) {
        const session = await getServerSession(authOptions);

        if (!session) {
          return NextResponse.json(
            { error: 'Authentication required', requestId },
            { status: 401 }
          );
        }

        if (options.requireAdmin && session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin access required', requestId },
            { status: 403 }
          );
        }
      }

      // Execute the handler
      const response = await handler(request, context);
      response.headers.set('x-request-id', requestId);

      return response;

    } catch (error) {
      const { response: errorResponse, statusCode } = formatError(
        error as Error,
        requestId
      );

      console.error('API Error:', error);

      const response = NextResponse.json(errorResponse, { status: statusCode });
      response.headers.set('x-request-id', requestId);

      return response;
    }
  };
}

export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || generateRequestId();
}
