import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import ExcelJS from 'exceljs';
import { todayQatar } from '@/lib/date';

// GET /api/scans/export - Export scans to Excel
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};

  if (projectId) {
    where.accreditation = { projectId };
  }

  if (from || to) {
    where.scannedAt = {};
    if (from) {
      (where.scannedAt as Record<string, Date>).gte = new Date(from);
    }
    if (to) {
      (where.scannedAt as Record<string, Date>).lte = new Date(to);
    }
  }

  const scans = await prisma.accreditationScan.findMany({
    where,
    include: {
      accreditation: {
        select: {
          accreditationNumber: true,
          firstName: true,
          lastName: true,
          company: true,
          role: true,
          accessGroup: true,
          project: { select: { name: true, code: true } },
        },
      },
      scannedBy: { select: { name: true, email: true } },
    },
    orderBy: { scannedAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scans');

  worksheet.columns = [
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Accreditation #', key: 'accreditationNumber', width: 15 },
    { header: 'First Name', key: 'firstName', width: 15 },
    { header: 'Last Name', key: 'lastName', width: 15 },
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Access Group', key: 'accessGroup', width: 15 },
    { header: 'Phase', key: 'phase', width: 12 },
    { header: 'Result', key: 'result', width: 12 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Scanned By', key: 'scannedBy', width: 20 },
    { header: 'Scanned At', key: 'scannedAt', width: 20 },
    { header: 'Device', key: 'device', width: 30 },
    { header: 'IP Address', key: 'ipAddress', width: 15 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  scans.forEach((scan) => {
    const acc = scan.accreditation;
    worksheet.addRow({
      project: acc?.project.name ?? '',
      accreditationNumber: acc?.accreditationNumber ?? '',
      firstName: acc?.firstName ?? '',
      lastName: acc?.lastName ?? '',
      company: acc?.company ?? '',
      role: acc?.role ?? '',
      accessGroup: acc?.accessGroup ?? '',
      phase: scan.phase,
      result: scan.result,
      location: scan.location || '',
      scannedBy: scan.scannedBy.name || scan.scannedBy.email,
      scannedAt: scan.scannedAt.toISOString().replace('T', ' ').slice(0, 19),
      device: scan.device || '',
      ipAddress: scan.ipAddress || '',
      notes: scan.notes || '',
    });
  });

  // Color code results
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const resultCell = row.getCell('result');
    const result = resultCell.value as string;

    if (result === 'ALLOWED') {
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' },
      };
    } else if (result === 'DENIED' || result === 'REVOKED') {
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF6B6B' },
      };
    } else if (result === 'WRONG_PHASE') {
      resultCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFA500' },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="scans-${todayQatar()}.xlsx"`,
    },
  });
}, { requireAuth: true });
