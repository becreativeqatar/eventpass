import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { stringToPhases } from '@/lib/validations/accreditation';
import { toQatarDateString } from '@/lib/date';
import ExcelJS from 'exceljs';

// GET /api/export - Export accreditations to Excel
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

  const where = projectId ? { projectId } : {};

  const accreditations = await prisma.accreditation.findMany({
    where,
    include: {
      project: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Accreditations');

  worksheet.columns = [
    { header: 'Accreditation #', key: 'accreditationNumber', width: 16 },
    { header: 'First Name', key: 'firstName', width: 15 },
    { header: 'Last Name', key: 'lastName', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Access Group', key: 'accessGroup', width: 15 },
    { header: 'ID Type', key: 'idType', width: 10 },
    { header: 'QID Number', key: 'qidNumber', width: 14 },
    { header: 'QID Expiry', key: 'qidExpiry', width: 12 },
    { header: 'Passport Number', key: 'passportNumber', width: 16 },
    { header: 'Passport Expiry', key: 'passportExpiry', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Phases', key: 'phases', width: 25 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Created By', key: 'createdBy', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 18 },
    { header: 'Approved By', key: 'approvedBy', width: 20 },
    { header: 'Approved At', key: 'approvedAt', width: 18 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  accreditations.forEach((acc) => {
    worksheet.addRow({
      accreditationNumber: acc.accreditationNumber,
      firstName: acc.firstName,
      lastName: acc.lastName,
      email: acc.email || '',
      phone: acc.phone || '',
      company: acc.company || '',
      role: acc.role || '',
      accessGroup: acc.accessGroup,
      idType: acc.identificationType?.toUpperCase() || 'QID',
      qidNumber: acc.qidNumber || '',
      qidExpiry: toQatarDateString(acc.qidExpiry),
      passportNumber: acc.passportNumber || '',
      passportExpiry: toQatarDateString(acc.passportExpiry),
      status: acc.status,
      phases: stringToPhases(acc.phases).join(', '),
      project: acc.project.name,
      createdBy: acc.createdBy.name || acc.createdBy.email,
      createdAt: toQatarDateString(acc.createdAt),
      approvedBy: acc.approvedBy?.name || acc.approvedBy?.email || '',
      approvedAt: toQatarDateString(acc.approvedAt),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="accreditations-${toQatarDateString(new Date())}.xlsx"`,
    },
  });
}, { requireAuth: true });
