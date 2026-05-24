import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const accreditation = await prisma.accreditation.findUnique({
      where: { id },
      select: { verificationToken: true, status: true },
    });

    if (!accreditation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (accreditation.status !== 'APPROVED') {
      return NextResponse.json({ error: 'QR code only available for approved accreditations' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${accreditation.verificationToken}`;

    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#101820', light: '#ffffff' },
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
