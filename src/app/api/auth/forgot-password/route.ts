import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasswordToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      // Always return 200 to not reveal email existence
      return NextResponse.json({ success: true });
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = await generatePasswordToken(user.email, 1); // 1 hour expiry
    await sendPasswordResetEmail(user.email, user.name || '', token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[forgot-password] Error:', err);
    // Still return 200 to not leak info
    return NextResponse.json({ success: true });
  }
}
