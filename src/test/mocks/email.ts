import { vi } from 'vitest';

export const sendInviteEmail = vi.fn().mockResolvedValue(undefined);
export const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);
export const sendApprovalNotificationEmail = vi.fn().mockResolvedValue(undefined);
