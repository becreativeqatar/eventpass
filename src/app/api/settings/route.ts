import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
});

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  'app.name': 'EventPass',
  'app.logo': '',
  'scan.requireLocation': 'false',
  'scan.allowMultipleScansPerPhase': 'true',
  'notifications.emailEnabled': 'false',
  'notifications.adminEmail': '',
};

// GET /api/settings - Get all settings
export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin can view settings
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await prisma.systemSettings.findMany();

  // Merge with defaults
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return NextResponse.json({ data: settingsMap });
}, { requireAuth: true });

// PUT /api/settings - Update settings
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admin can update settings
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { settings } = updateSettingsSchema.parse(body);

  // Upsert each setting
  for (const { key, value } of settings) {
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // Fetch updated settings
  const allSettings = await prisma.systemSettings.findMany();
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
  allSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return NextResponse.json({ data: settingsMap });
}, { requireAuth: true });
