vi.mock('@/lib/email', () => ({
  sendApprovalNotificationEmail: vi.fn(),
}));

import { sendApprovalNotificationEmail } from '@/lib/email';
import { notifyAdminOfPendingApproval } from '@/lib/notifications';

const mockSendApproval = vi.mocked(sendApprovalNotificationEmail);

const accreditation = {
  firstName: 'Ahmed',
  lastName: 'Ali',
  company: 'Test Corp',
  role: 'Media',
  accreditationNumber: 'ACC-001',
};

describe('notifyAdminOfPendingApproval', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendApproval.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('calls sendApprovalNotificationEmail with ADMIN_EMAIL', async () => {
    process.env.ADMIN_EMAIL = 'admin@bce.qa';

    await notifyAdminOfPendingApproval(accreditation);

    expect(mockSendApproval).toHaveBeenCalledOnce();
    expect(mockSendApproval).toHaveBeenCalledWith(accreditation, 'admin@bce.qa');
  });

  it('does nothing when ADMIN_EMAIL is not set', async () => {
    delete process.env.ADMIN_EMAIL;

    await notifyAdminOfPendingApproval(accreditation);

    expect(mockSendApproval).not.toHaveBeenCalled();
  });

  it('catches and logs errors silently', async () => {
    process.env.ADMIN_EMAIL = 'admin@bce.qa';
    mockSendApproval.mockRejectedValue(new Error('Email service down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    await expect(
      notifyAdminOfPendingApproval(accreditation),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[notifications] Failed to notify admin:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('returns void on success', async () => {
    process.env.ADMIN_EMAIL = 'admin@bce.qa';

    const result = await notifyAdminOfPendingApproval(accreditation);
    expect(result).toBeUndefined();
  });
});
