import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to check if today is within a date range
function isWithinRange(start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
}

// GET /api/verify/[token] - Public verification endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const accreditation = await prisma.accreditation.findUnique({
    where: { verificationToken: token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          bumpInStart: true,
          bumpInEnd: true,
          liveStart: true,
          liveEnd: true,
          bumpOutStart: true,
          bumpOutEnd: true,
        },
      },
    },
  });

  if (!accreditation) {
    return NextResponse.json(
      {
        message: 'Invalid QR Code - This code does not exist in our system',
        errorType: 'NOT_FOUND'
      },
      { status: 404 }
    );
  }

  // Check status
  if (accreditation.status === 'REVOKED') {
    return NextResponse.json(
      {
        message: 'This accreditation has been revoked',
        errorType: 'REVOKED',
        name: `${accreditation.firstName} ${accreditation.lastName}`,
      },
      { status: 403 }
    );
  }

  if (accreditation.status === 'REJECTED') {
    return NextResponse.json(
      {
        message: 'This application has been rejected',
        errorType: 'REJECTED',
        name: `${accreditation.firstName} ${accreditation.lastName}`,
      },
      { status: 403 }
    );
  }

  if (accreditation.status === 'PENDING') {
    return NextResponse.json(
      {
        message: 'This accreditation is pending approval',
        errorType: 'PENDING',
        name: `${accreditation.firstName} ${accreditation.lastName}`,
      },
      { status: 403 }
    );
  }

  if (accreditation.status !== 'APPROVED') {
    return NextResponse.json(
      {
        message: `Status: ${accreditation.status}`,
        errorType: 'DENIED',
      },
      { status: 403 }
    );
  }

  // Build phase information — return ISO strings for client-side formatting
  const phases = {
    bumpIn: accreditation.hasBumpInAccess ? {
      start: (accreditation.bumpInStart || accreditation.project.bumpInStart)?.toISOString(),
      end: (accreditation.bumpInEnd || accreditation.project.bumpInEnd)?.toISOString(),
    } : null,
    live: accreditation.hasLiveAccess ? {
      start: (accreditation.liveStart || accreditation.project.liveStart)?.toISOString(),
      end: (accreditation.liveEnd || accreditation.project.liveEnd)?.toISOString(),
    } : null,
    bumpOut: accreditation.hasBumpOutAccess ? {
      start: (accreditation.bumpOutStart || accreditation.project.bumpOutStart)?.toISOString(),
      end: (accreditation.bumpOutEnd || accreditation.project.bumpOutEnd)?.toISOString(),
    } : null,
  };

  // Check if valid today
  const isValidToday =
    isWithinRange(
      accreditation.hasBumpInAccess ? (accreditation.bumpInStart || accreditation.project.bumpInStart) : null,
      accreditation.hasBumpInAccess ? (accreditation.bumpInEnd || accreditation.project.bumpInEnd) : null
    ) ||
    isWithinRange(
      accreditation.hasLiveAccess ? (accreditation.liveStart || accreditation.project.liveStart) : null,
      accreditation.hasLiveAccess ? (accreditation.liveEnd || accreditation.project.liveEnd) : null
    ) ||
    isWithinRange(
      accreditation.hasBumpOutAccess ? (accreditation.bumpOutStart || accreditation.project.bumpOutStart) : null,
      accreditation.hasBumpOutAccess ? (accreditation.bumpOutEnd || accreditation.project.bumpOutEnd) : null
    );

  // If not valid today, return error with phase info
  if (!isValidToday) {
    return NextResponse.json(
      {
        message: 'This accreditation is not valid for today',
        errorType: 'NOT_VALID_TODAY',
        name: `${accreditation.firstName} ${accreditation.lastName}`,
        phases,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    valid: true,
    status: accreditation.status,
    message: 'Valid accreditation',
    data: {
      id: accreditation.id,
      firstName: accreditation.firstName,
      lastName: accreditation.lastName,
      company: accreditation.company,
      role: accreditation.role,
      accessGroup: accreditation.accessGroup,
      photoUrl: accreditation.photoUrl,
      qidNumber: accreditation.qidNumber,
      phases,
      isValidToday,
      project: {
        name: accreditation.project.name,
        code: accreditation.project.code,
      },
      status: accreditation.status,
    },
  });
}
