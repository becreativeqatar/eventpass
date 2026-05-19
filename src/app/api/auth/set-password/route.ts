import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { validatePasswordToken, consumePasswordToken } from '@/lib/tokens';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    const email = await validatePasswordToken(token);
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid or expired link. Please request a new one.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    await consumePasswordToken(token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[set-password] Error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
