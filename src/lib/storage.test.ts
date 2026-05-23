const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockList = vi.fn();

const mockFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
  createSignedUrl: mockCreateSignedUrl,
  list: mockList,
}));

const mockStorage = { from: mockFrom };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: mockStorage,
  })),
}));

describe('storage', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('isStorageConfigured', () => {
    it('returns true when env vars are set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.SUPABASE_BUCKET = 'test-bucket';

      const { isStorageConfigured } = await import('@/lib/storage');

      expect(isStorageConfigured()).toBe(true);
    });

    it('returns false when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { isStorageConfigured } = await import('@/lib/storage');

      expect(isStorageConfigured()).toBe(false);
    });

    it('returns false when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { isStorageConfigured } = await import('@/lib/storage');

      expect(isStorageConfigured()).toBe(false);
    });
  });

  describe('with configured storage', () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      process.env.SUPABASE_BUCKET = 'test-bucket';
    });

    it('sbUpload calls storage.upload with correct params', async () => {
      const { sbUpload } = await import('@/lib/storage');

      mockUpload.mockResolvedValue({
        data: { path: 'photos/test.jpg' },
        error: null,
      });

      const bytes = Buffer.from('fake-image-data');
      const result = await sbUpload({
        path: 'photos/test.jpg',
        bytes,
        contentType: 'image/jpeg',
      });

      expect(mockFrom).toHaveBeenCalledWith('test-bucket');
      expect(mockUpload).toHaveBeenCalledWith('photos/test.jpg', bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      expect(result).toEqual({ path: 'photos/test.jpg' });
    });

    it('sbUpload throws on upload error', async () => {
      const { sbUpload } = await import('@/lib/storage');

      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      await expect(
        sbUpload({
          path: 'photos/test.jpg',
          bytes: Buffer.from('data'),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow('Upload failed: Upload failed');
    });

    it('sbRemove calls storage.remove with path array', async () => {
      const { sbRemove } = await import('@/lib/storage');

      mockRemove.mockResolvedValue({ data: [{ name: 'test.jpg' }], error: null });

      await sbRemove('photos/test.jpg');

      expect(mockFrom).toHaveBeenCalledWith('test-bucket');
      expect(mockRemove).toHaveBeenCalledWith(['photos/test.jpg']);
    });

    it('sbPublicUrl returns correct URL', async () => {
      const { sbPublicUrl } = await import('@/lib/storage');

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test-bucket/photos/test.jpg' },
      });

      const url = await sbPublicUrl('photos/test.jpg');

      expect(mockFrom).toHaveBeenCalledWith('test-bucket');
      expect(mockGetPublicUrl).toHaveBeenCalledWith('photos/test.jpg');
      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/public/test-bucket/photos/test.jpg',
      );
    });

    it('sbSignedUrl returns signed URL', async () => {
      const { sbSignedUrl } = await import('@/lib/storage');

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/test-bucket/photos/test.jpg?token=abc' },
        error: null,
      });

      const url = await sbSignedUrl('photos/test.jpg', 7200);

      expect(mockFrom).toHaveBeenCalledWith('test-bucket');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('photos/test.jpg', 7200);
      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/sign/test-bucket/photos/test.jpg?token=abc',
      );
    });

    it('sbSignedUrl uses default expiry of 3600', async () => {
      const { sbSignedUrl } = await import('@/lib/storage');

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://signed.url' },
        error: null,
      });

      await sbSignedUrl('photos/test.jpg');

      expect(mockCreateSignedUrl).toHaveBeenCalledWith('photos/test.jpg', 3600);
    });
  });

  describe('without configured storage', () => {
    it('sbUpload throws when not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Need to make createClient return null-storage client
      const { createClient } = await import('@supabase/supabase-js');
      vi.mocked(createClient).mockReturnValue(null as never);

      const { sbUpload } = await import('@/lib/storage');

      await expect(
        sbUpload({
          path: 'test.jpg',
          bytes: Buffer.from('data'),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow('Supabase is not configured');
    });
  });
});
