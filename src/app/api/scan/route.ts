import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { scanSchema, stringToPhases, AccreditationStatus, ScanResult, isExpired } from '@/lib/validations/accreditation';

// POST /api/scan - Scan QR code and verify accreditation
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only validators and admins can scan
  if (!['ADMIN', 'MANAGER', 'VALIDATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { verificationToken, phase, location, notes } = parsed.data;

  // Find accreditation by token
  const accreditation = await prisma.accreditation.findUnique({
    where: { verificationToken },
    include: {
      project: {
        select: {
          id: true,
          name: true,
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
    // Log failed scan for unknown tokens
    const userAgent = request.headers.get('user-agent') || null;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null;

    await prisma.accreditationScan.create({
      data: {
        accreditationId: null,
        scannedById: session.user.id,
        phase,
        location,
        result: 'DENIED',
        notes: notes || 'Invalid or unknown accreditation token',
        device: userAgent,
        ipAddress,
      },
    });

    return NextResponse.json({
      data: {
        allowed: false,
        result: 'DENIED',
        message: 'Invalid or unknown accreditation',
      },
    });
  }

  // Convert phases string to array for checking
  const phasesArray = stringToPhases(accreditation.phases);
  const now = new Date();

  // Determine scan result with comprehensive checks
  let result: string;
  let message: string;
  let allowed = false;

  // Check 1: Accreditation status
  if (accreditation.status === AccreditationStatus.REVOKED) {
    result = ScanResult.REVOKED;
    message = 'Accreditation has been revoked';
  } else if (accreditation.status === AccreditationStatus.EXPIRED) {
    result = ScanResult.EXPIRED;
    message = 'Accreditation has expired';
  } else if (accreditation.status !== AccreditationStatus.APPROVED) {
    result = ScanResult.DENIED;
    message = `Accreditation status: ${accreditation.status}`;
  }
  // Check 2: ID document expiry
  else if (accreditation.identificationType === 'qid' && isExpired(accreditation.qidExpiry)) {
    result = ScanResult.ID_EXPIRED;
    message = 'QID has expired';
  } else if (accreditation.identificationType === 'passport') {
    if (isExpired(accreditation.passportExpiry)) {
      result = ScanResult.ID_EXPIRED;
      message = 'Passport has expired';
    } else if (isExpired(accreditation.hayyaExpiry)) {
      result = ScanResult.ID_EXPIRED;
      message = 'Hayya visa has expired';
    } else {
      // Passport and Hayya are valid, continue checks
      result = '';
      message = '';
    }
  }
  // Check 3: Phase access
  else if (!phasesArray.includes(phase)) {
    result = ScanResult.WRONG_PHASE;
    message = `No access for ${phase} phase`;
  }
  // Check 4: Phase date validity (if per-accreditation dates are set)
  else {
    let phaseValid = true;
    let phaseMessage = '';

    // Check phase-specific dates
    if (phase === 'BUMP_IN' && accreditation.hasBumpInAccess) {
      if (accreditation.bumpInStart && now < accreditation.bumpInStart) {
        phaseValid = false;
        phaseMessage = 'Bump-In access not yet valid';
      } else if (accreditation.bumpInEnd && now > accreditation.bumpInEnd) {
        phaseValid = false;
        phaseMessage = 'Bump-In access has expired';
      }
    } else if (phase === 'LIVE' && accreditation.hasLiveAccess) {
      if (accreditation.liveStart && now < accreditation.liveStart) {
        phaseValid = false;
        phaseMessage = 'Live access not yet valid';
      } else if (accreditation.liveEnd && now > accreditation.liveEnd) {
        phaseValid = false;
        phaseMessage = 'Live access has expired';
      }
    } else if (phase === 'BUMP_OUT' && accreditation.hasBumpOutAccess) {
      if (accreditation.bumpOutStart && now < accreditation.bumpOutStart) {
        phaseValid = false;
        phaseMessage = 'Bump-Out access not yet valid';
      } else if (accreditation.bumpOutEnd && now > accreditation.bumpOutEnd) {
        phaseValid = false;
        phaseMessage = 'Bump-Out access has expired';
      }
    }

    // If per-accreditation dates aren't set, fall back to project dates
    if (phaseValid && !accreditation.hasBumpInAccess && !accreditation.hasLiveAccess && !accreditation.hasBumpOutAccess) {
      // Check project phase dates
      if (phase === 'BUMP_IN') {
        if (accreditation.project.bumpInStart && now < accreditation.project.bumpInStart) {
          phaseValid = false;
          phaseMessage = 'Bump-In phase has not started';
        } else if (accreditation.project.bumpInEnd && now > accreditation.project.bumpInEnd) {
          phaseValid = false;
          phaseMessage = 'Bump-In phase has ended';
        }
      } else if (phase === 'LIVE') {
        if (accreditation.project.liveStart && now < accreditation.project.liveStart) {
          phaseValid = false;
          phaseMessage = 'Live phase has not started';
        } else if (accreditation.project.liveEnd && now > accreditation.project.liveEnd) {
          phaseValid = false;
          phaseMessage = 'Live phase has ended';
        }
      } else if (phase === 'BUMP_OUT') {
        if (accreditation.project.bumpOutStart && now < accreditation.project.bumpOutStart) {
          phaseValid = false;
          phaseMessage = 'Bump-Out phase has not started';
        } else if (accreditation.project.bumpOutEnd && now > accreditation.project.bumpOutEnd) {
          phaseValid = false;
          phaseMessage = 'Bump-Out phase has ended';
        }
      }
    }

    if (!phaseValid) {
      result = ScanResult.WRONG_PHASE;
      message = phaseMessage;
    } else {
      result = ScanResult.ALLOWED;
      message = 'Access granted';
      allowed = true;
    }
  }

  // Get device and IP info from headers
  const userAgent = request.headers.get('user-agent') || null;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null;

  // Record the scan
  await prisma.accreditationScan.create({
    data: {
      accreditationId: accreditation.id,
      scannedById: session.user.id,
      phase,
      location,
      result,
      notes,
      device: userAgent,
      ipAddress,
    },
  });

  // Build ID info for response
  const idInfo = accreditation.identificationType === 'qid'
    ? {
        type: 'QID',
        number: accreditation.qidNumber,
        expiry: accreditation.qidExpiry,
        isExpired: isExpired(accreditation.qidExpiry),
      }
    : {
        type: 'Passport',
        number: accreditation.passportNumber,
        country: accreditation.passportCountry,
        expiry: accreditation.passportExpiry,
        hayyaExpiry: accreditation.hayyaExpiry,
        isExpired: isExpired(accreditation.passportExpiry) || isExpired(accreditation.hayyaExpiry),
      };

  return NextResponse.json({
    data: {
      allowed,
      result,
      message,
      accreditation: {
        id: accreditation.id,
        accreditationNumber: accreditation.accreditationNumber,
        firstName: accreditation.firstName,
        lastName: accreditation.lastName,
        company: accreditation.company,
        role: accreditation.role,
        photoUrl: accreditation.photoUrl,
        phases: phasesArray,
        status: accreditation.status,
        idInfo,
        project: {
          id: accreditation.project.id,
          name: accreditation.project.name,
        },
      },
    },
  });
}, { requireAuth: true });
