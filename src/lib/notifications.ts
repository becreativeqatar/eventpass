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
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    await sendApprovalNotificationEmail(accreditation, adminEmail);
  } catch (err) {
    console.error('[notifications] Failed to notify admin:', err);
  }
}
