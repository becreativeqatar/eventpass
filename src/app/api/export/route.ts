import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { stringToPhases } from '@/lib/validations/accreditation';
import ExcelJS from 'exceljs';

// GET /api/export - Export accreditations to Excel
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    { header: 'First Name', key: 'firstName', width: 15 },
    { header: 'Last Name', key: 'lastName', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Role', key: 'role', width: 15 },
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
      firstName: acc.firstName,
      lastName: acc.lastName,
      email: acc.email || '',
      phone: acc.phone || '',
      company: acc.company || '',
      role: acc.role || '',
      status: acc.status,
      phases: stringToPhases(acc.phases).join(', '),
      project: acc.project.name,
      createdBy: acc.createdBy.name || acc.createdBy.email,
      createdAt: acc.createdAt.toISOString().split('T')[0],
      approvedBy: acc.approvedBy?.name || acc.approvedBy?.email || '',
      approvedAt: acc.approvedAt?.toISOString().split('T')[0] || '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="accreditations-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}, { requireAuth: true });
