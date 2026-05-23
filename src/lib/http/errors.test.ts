import { z } from 'zod';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  formatZodError,
  formatError,
} from '@/lib/http/errors';

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('sets message and default statusCode 500', () => {
    const err = new AppError('boom');
    expect(err.message).toBe('boom');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });

  it('accepts custom statusCode and isOperational', () => {
    const err = new AppError('fail', 503, false);
    expect(err.statusCode).toBe(503);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error', () => {
    expect(new AppError('x')).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
  });

  it('is an instance of AppError', () => {
    expect(new ValidationError('x')).toBeInstanceOf(AppError);
  });
});

describe('AuthenticationError', () => {
  it('defaults message to "Authentication required"', () => {
    const err = new AuthenticationError();
    expect(err.message).toBe('Authentication required');
    expect(err.statusCode).toBe(401);
  });

  it('accepts custom message', () => {
    expect(new AuthenticationError('Token expired').message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  it('defaults message to "Insufficient permissions"', () => {
    const err = new AuthorizationError();
    expect(err.message).toBe('Insufficient permissions');
    expect(err.statusCode).toBe(403);
  });

  it('accepts custom message', () => {
    expect(new AuthorizationError('Admin only').message).toBe('Admin only');
  });
});

describe('NotFoundError', () => {
  it('defaults to "Resource not found"', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.statusCode).toBe(404);
  });

  it('uses provided resource name', () => {
    expect(new NotFoundError('Project').message).toBe('Project not found');
  });
});

// ---------------------------------------------------------------------------
// formatZodError
// ---------------------------------------------------------------------------

describe('formatZodError', () => {
  it('transforms ZodError into APIError shape', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = schema.safeParse({ name: 123, age: 'old' });

    if (result.success) throw new Error('Expected parse failure');

    const formatted = formatZodError(result.error);
    expect(formatted.error).toBe('Validation Error');
    expect(formatted.message).toBe('Request validation failed');
    expect(Array.isArray(formatted.details)).toBe(true);

    const details = formatted.details as Array<{ field: string; message: string; code: string }>;
    expect(details.length).toBeGreaterThanOrEqual(2);
    expect(details[0]).toHaveProperty('field');
    expect(details[0]).toHaveProperty('message');
    expect(details[0]).toHaveProperty('code');
  });
});

// ---------------------------------------------------------------------------
// formatError
// ---------------------------------------------------------------------------

describe('formatError', () => {
  it('formats ZodError with statusCode 400', () => {
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse({ x: 123 });
    if (result.success) throw new Error('Expected failure');

    const { response, statusCode } = formatError(result.error);
    expect(statusCode).toBe(400);
    expect(response.error).toBe('Validation Error');
    expect(response.message).toBe('Request validation failed');
  });

  it('formats AppError with its statusCode', () => {
    const err = new NotFoundError('User');
    const { response, statusCode } = formatError(err);
    expect(statusCode).toBe(404);
    expect(response.error).toBe('NotFoundError');
    expect(response.message).toBe('User not found');
  });

  it('includes requestId when provided', () => {
    const err = new ValidationError('bad');
    const { response } = formatError(err, 'req_123');
    expect(response.requestId).toBe('req_123');
  });

  it('includes timestamp', () => {
    const { response } = formatError(new AppError('x'));
    expect(response.timestamp).toBeDefined();
  });

  describe('generic Error in development', () => {
    const originalEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'development'; });
    afterEach(() => { process.env.NODE_ENV = originalEnv; });

    it('exposes message and stack in development', () => {
      const err = new Error('secret internal detail');
      const { response, statusCode } = formatError(err);
      expect(statusCode).toBe(500);
      expect(response.error).toBe('Internal Server Error');
      expect(response.message).toBe('secret internal detail');
      expect(response.details).toBeDefined();
    });
  });

  describe('generic Error in production', () => {
    const originalEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'production'; });
    afterEach(() => { process.env.NODE_ENV = originalEnv; });

    it('hides message and stack in production', () => {
      const err = new Error('secret internal detail');
      const { response, statusCode } = formatError(err);
      expect(statusCode).toBe(500);
      expect(response.error).toBe('Internal Server Error');
      expect(response.message).toBe('An unexpected error occurred');
      expect(response.details).toBeUndefined();
    });
  });
});
