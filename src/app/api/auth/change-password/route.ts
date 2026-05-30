import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { passwordSchema } from '@/lib/validations/password';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password] Error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
