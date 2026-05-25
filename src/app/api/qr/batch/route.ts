import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import QRCode from 'qrcode';

// POST /api/qr/batch - Generate QR codes for multiple accreditations
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { ids, projectId, format = 'json' } = body;

  let accreditations;

  if (ids && Array.isArray(ids)) {
    // Generate for specific IDs
    accreditations = await prisma.accreditation.findMany({
      where: { id: { in: ids } },
      include: {
        project: { select: { name: true } },
      },
    });
  } else if (projectId) {
    // Generate for entire project
    accreditations = await prisma.accreditation.findMany({
      where: { projectId },
      include: {
        project: { select: { name: true } },
      },
    });
  } else {
    return NextResponse.json(
      { error: 'Either ids array or projectId is required' },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const results = await Promise.all(
    accreditations.map(async (acc) => {
      const verifyUrl = `${baseUrl}/verify/${acc.verificationToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return {
        id: acc.id,
        firstName: acc.firstName,
        lastName: acc.lastName,
        company: acc.company,
        role: acc.role,
        project: acc.project.name,
        verifyUrl,
        qrCode: qrDataUrl,
      };
    })
  );

  if (format === 'json') {
    return NextResponse.json({ data: results });
  }

  // HTML format for printing
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QR Codes - ${accreditations[0]?.project?.name || 'Accreditations'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
    }
    .badge {
      display: inline-block;
      width: 300px;
      padding: 20px;
      margin: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .badge img {
      width: 200px;
      height: 200px;
    }
    .name {
      font-size: 18px;
      font-weight: bold;
      margin: 10px 0 5px;
    }
    .company {
      font-size: 14px;
      color: #666;
    }
    .role {
      font-size: 12px;
      color: #888;
    }
    @media print {
      .badge {
        border: 1px solid #000;
      }
    }
  </style>
</head>
<body>
  ${results
    .map(
      (r) => `
    <div class="badge">
      <img src="${r.qrCode}" alt="QR Code" />
      <div class="name">${r.firstName} ${r.lastName}</div>
      ${r.company ? `<div class="company">${r.company}</div>` : ''}
      ${r.role ? `<div class="role">${r.role}</div>` : ''}
    </div>
  `
    )
    .join('')}
</body>
</html>
`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}, { requireAuth: true });
