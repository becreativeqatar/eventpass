import { prisma } from './prisma';
import { sendApprovalNotificationEmail } from './email';

interface AccreditationInfo {
  firstName: string;
  lastName: string;
  company: string | null;
  role: string | null;
  accreditationNumber: string;
}

export async function notifyAdminOfPendingApproval(accreditation: AccreditationInfo): Promise<void> {
  try {
    const [enabledSetting, emailSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: 'notifications.emailEnabled' } }),
      prisma.systemSettings.findUnique({ where: { key: 'notifications.adminEmail' } }),
    ]);

    if (enabledSetting?.value !== 'true' || !emailSetting?.value) {
      return;
    }

    await sendApprovalNotificationEmail(accreditation, emailSetting.value);
  } catch (err) {
    console.error('[notifications] Failed to notify admin:', err);
  }
}
