import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { sbUpload, sbRemove, isStorageConfigured } from '@/lib/storage';

// POST /api/accreditations/[id]/photo - Upload photo
export const POST = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'Accreditation ID required' }, { status: 400 });
  }

  // Check if storage is configured
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'Photo storage is not configured. Please set up Supabase storage.' },
      { status: 503 }
    );
  }

  // Check accreditation exists
  const accreditation = await prisma.accreditation.findUnique({
    where: { id },
  });

  if (!accreditation) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('photo') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
      { status: 400 }
    );
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 }
    );
  }

  try {
    // Delete old photo if exists
    if (accreditation.photoUrl) {
      const oldPath = accreditation.photoUrl.split('/').pop();
      if (oldPath) {
        try {
          await sbRemove(`photos/${oldPath}`);
        } catch {
          // Ignore errors when deleting old photo
        }
      }
    }

    // Upload new photo
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1];
    const filename = `${id}-${Date.now()}.${ext}`;
    const path = `photos/${filename}`;

    await sbUpload({
      path,
      bytes,
      contentType: file.type,
    });

    // Get public URL (or construct it)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucket = process.env.SUPABASE_BUCKET || 'accreditation-photos';
    const photoUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;

    // Update accreditation with photo URL
    await prisma.accreditation.update({
      where: { id },
      data: { photoUrl },
    });

    return NextResponse.json({ data: { photoUrl } });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}, { requireAuth: true });

// DELETE /api/accreditations/[id]/photo - Remove photo
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = (await context.params)?.id;
  if (!id) {
    return NextResponse.json({ error: 'Accreditation ID required' }, { status: 400 });
  }

  const accreditation = await prisma.accreditation.findUnique({
    where: { id },
  });

  if (!accreditation) {
    return NextResponse.json({ error: 'Accreditation not found' }, { status: 404 });
  }

  if (!accreditation.photoUrl) {
    return NextResponse.json({ error: 'No photo to delete' }, { status: 400 });
  }

  try {
    // Delete from storage
    const oldPath = accreditation.photoUrl.split('/').pop();
    if (oldPath && isStorageConfigured()) {
      await sbRemove(`photos/${oldPath}`);
    }

    // Update accreditation
    await prisma.accreditation.update({
      where: { id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}, { requireAuth: true });
