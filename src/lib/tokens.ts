import { randomUUID } from 'crypto';
import { prisma } from './prisma';

export async function generatePasswordToken(email: string, expiresInHours: number): Promise<string> {
  const token = randomUUID();
  const expires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

export async function validatePasswordToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  return record.identifier;
}

export async function consumePasswordToken(token: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {
    // Token may already be consumed
  });
}
