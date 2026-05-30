import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { phasesToString, VALID_PHASES, type AccreditationPhase } from '@/lib/validations/accreditation';
import ExcelJS from 'exceljs';

// POST /api/import - Bulk import accreditations from Excel
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('projectId') as string;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

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

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    return NextResponse.json({ error: 'No worksheet found' }, { status: 400 });
  }

  const records: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
    phases: AccreditationPhase[];
  }> = [];

  const errors: Array<{ row: number; error: string }> = [];

  // Skip header row, start from row 2
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const firstName = row.getCell(1).text?.trim();
    const lastName = row.getCell(2).text?.trim();
    const email = row.getCell(3).text?.trim() || undefined;
    const phone = row.getCell(4).text?.trim() || undefined;
    const company = row.getCell(5).text?.trim() || undefined;
    const role = row.getCell(6).text?.trim() || undefined;
    const phasesRaw = row.getCell(7).text?.trim() || 'LIVE';

    if (!firstName || !lastName) {
      errors.push({ row: rowNumber, error: 'First name and last name are required' });
      return;
    }

    // Parse phases
    const phases = phasesRaw
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter((p): p is AccreditationPhase => VALID_PHASES.includes(p as AccreditationPhase));

    if (phases.length === 0) {
      phases.push('LIVE');
    }

    records.push({ firstName, lastName, email, phone, company, role, phases });
  });

  if (records.length === 0) {
    return NextResponse.json({ error: 'No valid records found', errors }, { status: 400 });
  }

  // Get the last accreditation number for this project to generate new ones
  const prefix = (project.code || project.id.slice(0, 6)).toUpperCase();
  const lastAccreditation = await prisma.accreditation.findFirst({
    where: { projectId },
    orderBy: { accreditationNumber: 'desc' },
    select: { accreditationNumber: true },
  });

  let nextNumber = 1;
  if (lastAccreditation?.accreditationNumber) {
    const match = lastAccreditation.accreditationNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Create accreditations in batch with sequential accreditation numbers
  const created = await prisma.$transaction(
    records.map((record, index) =>
      prisma.accreditation.create({
        data: {
          accreditationNumber: `${prefix}-${(nextNumber + index).toString().padStart(4, '0')}`,
          projectId,
          firstName: record.firstName,
          lastName: record.lastName,
          email: record.email,
          phone: record.phone,
          company: record.company,
          role: record.role,
          phases: phasesToString(record.phases),
          createdById: session.user.id,
        },
      })
    )
  );

  // Log CREATED history for all imported records
  await prisma.accreditationHistory.createMany({
    data: created.map((acc) => ({
      accreditationId: acc.id,
      action: 'CREATED',
      newStatus: acc.status,
      notes: 'Imported from Excel',
      performedById: session.user.id,
    })),
  });

  return NextResponse.json({
    message: `Successfully imported ${created.length} accreditations`,
    imported: created.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}, { requireAuth: true });
