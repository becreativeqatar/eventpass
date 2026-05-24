import { NextRequest, NextResponse } from 'next/server';
import { validatePasswordToken } from '@/lib/tokens';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const email = await validatePasswordToken(token);

  if (!email) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  // Check user still exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'User no longer exists' }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}
