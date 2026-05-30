import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { todayQatar } from '@/lib/date';

// GET /api/qr/batch-export - Export QR codes as a ZIP file
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const accessGroup = searchParams.get('accessGroup');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Verify project exists
  const project = await prisma.accreditationProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get approved accreditations for the project
  const accreditations = await prisma.accreditation.findMany({
    where: {
      projectId,
      status: 'APPROVED',
      ...(accessGroup && accessGroup !== 'all' ? { accessGroup } : {}),
    },
    select: {
      id: true,
      accreditationNumber: true,
      firstName: true,
      lastName: true,
      company: true,
      accessGroup: true,
      verificationToken: true,
    },
  });

  if (accreditations.length === 0) {
    return NextResponse.json(
      { error: 'No approved accreditations found for this project' },
      { status: 404 }
    );
  }

  // Get base URL for QR codes
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Create ZIP file
  const zip = new JSZip();

  // Generate QR codes for each accreditation
  for (const acc of accreditations) {
    const verifyUrl = `${baseUrl}/verify/${acc.verificationToken}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    // Create filename: ACC-0001_John_Doe.png
    const safeName = `${acc.firstName}_${acc.lastName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${acc.accreditationNumber}_${safeName}.png`;

    zip.file(filename, qrBuffer);
  }

  // Generate ZIP as blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Return as downloadable file
  const projectCode = project.code || project.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `QR-Codes-${projectCode}-${todayQatar()}.zip`;

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, { requireAuth: true });
