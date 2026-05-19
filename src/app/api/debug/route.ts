import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  // Mask the password
  const masked = dbUrl.replace(/:[^@]+@/, ':***@');

  return NextResponse.json({
    DATABASE_URL: masked,
    DIRECT_URL: process.env.DIRECT_URL ? 'SET' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
