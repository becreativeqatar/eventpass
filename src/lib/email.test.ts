const mockSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

describe('email', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ id: 'email-id' });
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.NEXTAUTH_URL = 'https://eventpass.example.com';
    process.env.EMAIL_FROM = 'Test <test@example.com>';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadEmail() {
    return import('@/lib/email');
  }

  describe('sendInviteEmail', () => {
    it('sends email when API key is set', async () => {
      const { sendInviteEmail } = await loadEmail();
      await sendInviteEmail('user@test.com', 'John', 'token-123');

      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Set your password — BCE EventPass',
        }),
      );
    });

    it('skips sending when no API key (just logs)', async () => {
      delete process.env.RESEND_API_KEY;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendInviteEmail } = await loadEmail();
      await sendInviteEmail('user@test.com', 'John', 'token-123');

      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('RESEND_API_KEY not set'),
        'user@test.com',
      );

      consoleSpy.mockRestore();
    });

    it('includes set-password URL with token in HTML', async () => {
      const { sendInviteEmail } = await loadEmail();
      await sendInviteEmail('user@test.com', 'John', 'token-abc');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'https://eventpass.example.com/set-password?token=token-abc',
      );
    });

    it('uses EMAIL_FROM env var for from address', async () => {
      const { sendInviteEmail } = await loadEmail();
      await sendInviteEmail('user@test.com', 'John', 'token-123');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('Test <test@example.com>');
    });

    it('handles send failure gracefully', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { sendInviteEmail } = await loadEmail();

      // Should not throw
      await expect(
        sendInviteEmail('user@test.com', 'John', 'token-123'),
      ).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends email with reset link', async () => {
      const { sendPasswordResetEmail } = await loadEmail();
      await sendPasswordResetEmail('user@test.com', 'Jane', 'reset-token');

      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Reset your password — BCE EventPass',
        }),
      );
    });

    it('includes correct reset URL in HTML', async () => {
      const { sendPasswordResetEmail } = await loadEmail();
      await sendPasswordResetEmail('user@test.com', 'Jane', 'reset-xyz');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(
        'https://eventpass.example.com/set-password?token=reset-xyz',
      );
    });
  });

  describe('sendApprovalNotificationEmail', () => {
    const accreditation = {
      firstName: 'Ahmed',
      lastName: 'Ali',
      company: 'Test Corp',
      role: 'Media',
      accreditationNumber: 'ACC-001',
    };

    it('sends email with accreditation details', async () => {
      const { sendApprovalNotificationEmail } = await loadEmail();
      await sendApprovalNotificationEmail(accreditation, 'admin@test.com');

      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
          subject: 'Approval needed: Ahmed Ali — BCE EventPass',
        }),
      );
    });

    it('includes accreditation info in HTML body', async () => {
      const { sendApprovalNotificationEmail } = await loadEmail();
      await sendApprovalNotificationEmail(accreditation, 'admin@test.com');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Ahmed Ali');
      expect(callArgs.html).toContain('Test Corp');
      expect(callArgs.html).toContain('Media');
      expect(callArgs.html).toContain('ACC-001');
    });

    it('uses correct from address', async () => {
      const { sendApprovalNotificationEmail } = await loadEmail();
      await sendApprovalNotificationEmail(accreditation, 'admin@test.com');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('Test <test@example.com>');
    });
  });
});
