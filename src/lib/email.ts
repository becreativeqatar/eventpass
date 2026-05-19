import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function brandedHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f3f0;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background-color:#101820;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;color:#fafafa;font-size:14px;font-weight:300;text-transform:uppercase;letter-spacing:0.1em;">BCE EVENTPASS</h1>
    </div>
    <div style="background-color:#ffffff;padding:32px 24px;border:1px solid #d7d1ca;border-top:none;border-radius:0 0 8px 8px;">
      <h2 style="margin:0 0 16px;color:#e0251c;font-size:18px;font-weight:800;">${title}</h2>
      ${body}
    </div>
    <p style="text-align:center;margin-top:16px;font-size:11px;color:#999;">BCE EventPass &mdash; Accreditation Management</p>
  </div>
</body>
</html>`;
}

export async function sendInviteEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${getBaseUrl()}/set-password?token=${token}`;
  const html = brandedHtml(
    'You\'re Invited',
    `<p style="margin:0 0 16px;color:#101820;font-size:14px;line-height:1.6;">
        Hi ${name || 'there'},
      </p>
      <p style="margin:0 0 24px;color:#101820;font-size:14px;line-height:1.6;">
        An account has been created for you on BCE EventPass. Click the button below to set your password and get started.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e0251c,#8232a7);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;">Set Your Password</a>
      </div>
      <p style="margin:0;color:#999;font-size:12px;">This link expires in 24 hours. If you didn't expect this email, you can ignore it.</p>`
  );

  const client = getResend();
  if (!client) {
    console.log('[email] RESEND_API_KEY not set, skipping invite email to', email);
    console.log('[email] Set password URL:', url);
    return;
  }

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || 'BCE EventPass <eventpass@bce.qa>',
      to: email,
      subject: 'Set your password — BCE EventPass',
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send invite email:', err);
  }
}

export async function sendApprovalNotificationEmail(
  accreditation: { firstName: string; lastName: string; company: string | null; role: string | null; accreditationNumber: string },
  adminEmail: string,
): Promise<void> {
  const url = `${getBaseUrl()}/admin/approvals`;
  const html = brandedHtml(
    'New Approval Request',
    `<p style="margin:0 0 16px;color:#101820;font-size:14px;line-height:1.6;">
        A new accreditation has been submitted for approval.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#101820;margin:0 0 24px;">
        <tr><td style="padding:8px 0;font-weight:800;width:120px;">Name</td><td style="padding:8px 0;">${accreditation.firstName} ${accreditation.lastName}</td></tr>
        <tr><td style="padding:8px 0;font-weight:800;">Company</td><td style="padding:8px 0;">${accreditation.company || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;font-weight:800;">Role</td><td style="padding:8px 0;">${accreditation.role || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;font-weight:800;">Number</td><td style="padding:8px 0;">${accreditation.accreditationNumber}</td></tr>
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e0251c,#8232a7);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;">Review Approvals</a>
      </div>`
  );

  const client = getResend();
  if (!client) {
    console.log('[email] RESEND_API_KEY not set, skipping approval notification');
    return;
  }

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || 'BCE EventPass <eventpass@bce.qa>',
      to: adminEmail,
      subject: `Approval needed: ${accreditation.firstName} ${accreditation.lastName} — BCE EventPass`,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send approval notification:', err);
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${getBaseUrl()}/set-password?token=${token}`;
  const html = brandedHtml(
    'Reset Your Password',
    `<p style="margin:0 0 16px;color:#101820;font-size:14px;line-height:1.6;">
        Hi ${name || 'there'},
      </p>
      <p style="margin:0 0 24px;color:#101820;font-size:14px;line-height:1.6;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#e0251c,#8232a7);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;">Reset Password</a>
      </div>
      <p style="margin:0;color:#999;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can ignore it.</p>`
  );

  const client = getResend();
  if (!client) {
    console.log('[email] RESEND_API_KEY not set, skipping reset email to', email);
    console.log('[email] Reset password URL:', url);
    return;
  }

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || 'BCE EventPass <eventpass@bce.qa>',
      to: email,
      subject: 'Reset your password — BCE EventPass',
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send reset email:', err);
  }
}
