import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    accreditationHistory: {
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/storage', () => ({
  sbUpload: vi.fn().mockResolvedValue(undefined),
  sbRemove: vi.fn().mockResolvedValue(undefined),
  isStorageConfigured: vi.fn().mockReturnValue(true),
}));

import { POST, DELETE } from '@/app/api/accreditations/[id]/photo/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { sbUpload, sbRemove, isStorageConfigured } from '@/lib/storage';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildAccreditation, resetCounters } from '@/test/factories';
import { NextRequest } from 'next/server';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsStorageConfigured = vi.mocked(isStorageConfigured);
const mockSbUpload = vi.mocked(sbUpload);
const mockSbRemove = vi.mocked(sbRemove);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
  mockIsStorageConfigured.mockReturnValue(true);
});

function createFormDataRequest(
  url: string,
  id: string,
  file?: { name: string; type: string; size: number; content?: Uint8Array }
): NextRequest {
  const formData = new FormData();
  if (file) {
    const blob = new Blob([file.content ?? new Uint8Array(file.size)], { type: file.type });
    formData.append('photo', blob, file.name);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/accreditations/[id]/photo', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024,
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 503 when storage is not configured', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockIsStorageConfigured.mockReturnValue(false);

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024,
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(503);
    expect(body.error).toContain('not configured');
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024,
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when no file provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1' }) as never,
    );

    // Create a request with empty FormData (no file)
    const formData = new FormData();
    const req = new NextRequest(new URL('/api/accreditations/acc-1/photo', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('No photo');
  });

  it('returns 400 for invalid file type', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1' }) as never,
    );

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'doc.pdf',
      type: 'application/pdf',
      size: 1024,
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid file type');
  });

  it('returns 400 when file exceeds 5MB', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1' }) as never,
    );

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'huge.jpg',
      type: 'image/jpeg',
      size: 6 * 1024 * 1024, // 6MB
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('too large');
  });

  it('deletes old photo before uploading new one', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({
        id: 'acc-1',
        photoUrl: 'https://example.com/storage/v1/object/public/bucket/photos/old-photo.jpg',
      }) as never,
    );
    mockPrisma.accreditation.update.mockResolvedValue({} as never);

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'new-photo.jpg',
      type: 'image/jpeg',
      size: 1024,
      content: new Uint8Array(1024),
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
    expect(mockSbRemove).toHaveBeenCalledWith('photos/old-photo.jpg');
    expect(mockSbUpload).toHaveBeenCalled();
  });

  it('updates accreditation with photoUrl on success', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', photoUrl: null }) as never,
    );
    mockPrisma.accreditation.update.mockResolvedValue({} as never);

    const req = createFormDataRequest('/api/accreditations/acc-1/photo', 'acc-1', {
      name: 'photo.png',
      type: 'image/png',
      size: 2048,
      content: new Uint8Array(2048),
    });
    const res = await POST(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { photoUrl: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.photoUrl).toBeDefined();

    // Verify accreditation was updated with photoUrl
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.where.id).toBe('acc-1');
    expect(updateArgs.data.photoUrl).toContain('photos/');
  });
});

describe('DELETE /api/accreditations/[id]/photo', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/photo', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/photo', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when no photo exists', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', photoUrl: null }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/photo', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('No photo');
  });

  it('removes photo from storage and clears photoUrl', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({
        id: 'acc-1',
        photoUrl: 'https://example.com/storage/v1/object/public/bucket/photos/photo-123.jpg',
      }) as never,
    );
    mockPrisma.accreditation.update.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/photo', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSbRemove).toHaveBeenCalledWith('photos/photo-123.jpg');

    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.photoUrl).toBeNull();
  });
});
