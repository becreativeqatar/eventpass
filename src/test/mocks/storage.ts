import { vi } from 'vitest';

export const sbUpload = vi.fn().mockResolvedValue({ path: 'test/photo.jpg' });
export const sbRemove = vi.fn().mockResolvedValue(undefined);
export const sbPublicUrl = vi.fn().mockReturnValue('https://storage.test/photo.jpg');
export const sbSignedUrl = vi.fn().mockResolvedValue('https://storage.test/signed/photo.jpg');
export const sbList = vi.fn().mockResolvedValue([]);
export const isStorageConfigured = vi.fn().mockReturnValue(true);
