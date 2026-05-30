import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'admin123';

async function main() {
  console.log('Seeding database...');

  const passwordHash = hashSync(DEFAULT_PASSWORD, 12);
  const adminPasswordHash = hashSync('BeC@2036', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'digital@bce.qa' },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: 'BCE Admin',
      email: 'digital@bce.qa',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@eventpass.local' },
    update: { passwordHash },
    create: {
      name: 'Manager User',
      email: 'manager@eventpass.local',
      passwordHash,
      role: 'MANAGER',
    },
  });
  console.log(`Created manager user: ${manager.email}`);

  const staff = await prisma.user.upsert({
    where: { email: 'staff@eventpass.local' },
    update: { passwordHash },
    create: {
      name: 'Staff User',
      email: 'staff@eventpass.local',
      passwordHash,
      role: 'STAFF',
    },
  });
  console.log(`Created staff user: ${staff.email}`);

  const validator = await prisma.user.upsert({
    where: { email: 'validator@eventpass.local' },
    update: { passwordHash },
    create: {
      name: 'Validator User',
      email: 'validator@eventpass.local',
      passwordHash,
      role: 'VALIDATOR',
    },
  });
  console.log(`Created validator user: ${validator.email}`);

  // Create a sample project
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeWeeksFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  const project = await prisma.accreditationProject.upsert({
    where: { code: 'DEMO-2024' },
    update: {},
    create: {
      name: 'Demo Event 2024',
      code: 'DEMO-2024',
      description: 'A demonstration event for testing the accreditation system',
      venue: 'Demo Convention Center',
      status: 'ACTIVE',
      accessGroups: 'General,VIP,Staff,Media,Crew',
      eventDate: oneWeekFromNow,
      bumpInStart: now,
      bumpInEnd: oneWeekFromNow,
      liveStart: oneWeekFromNow,
      liveEnd: twoWeeksFromNow,
      bumpOutStart: twoWeeksFromNow,
      bumpOutEnd: threeWeeksFromNow,
      createdById: admin.id,
    },
  });
  console.log(`Created project: ${project.name}`);

  // Create sample accreditations
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const accreditation1 = await prisma.accreditation.upsert({
    where: { verificationToken: 'demo-token-1' },
    update: {},
    create: {
      accreditationNumber: 'DEMO-2024-0001',
      projectId: project.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+974 1234 5678',
      company: 'Demo Corp',
      role: 'Photographer',
      accessGroup: 'Media',
      status: 'APPROVED',
      phases: 'BUMP_IN,LIVE,BUMP_OUT',
      hasBumpInAccess: true,
      hasLiveAccess: true,
      hasBumpOutAccess: true,
      identificationType: 'qid',
      qidNumber: '12345678901',
      qidExpiry: oneYearFromNow,
      verificationToken: 'demo-token-1',
      createdById: staff.id,
      approvedById: manager.id,
      approvedAt: now,
    },
  });
  console.log(`Created accreditation: ${accreditation1.firstName} ${accreditation1.lastName}`);

  const accreditation2 = await prisma.accreditation.upsert({
    where: { verificationToken: 'demo-token-2' },
    update: {},
    create: {
      accreditationNumber: 'DEMO-2024-0002',
      projectId: project.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+974 9876 5432',
      company: 'VIP Guest',
      role: 'VIP',
      accessGroup: 'VIP',
      status: 'APPROVED',
      phases: 'LIVE',
      hasLiveAccess: true,
      identificationType: 'passport',
      passportNumber: 'AB1234567',
      passportCountry: 'United Kingdom',
      passportExpiry: oneYearFromNow,
      hayyaNumber: 'HAYYA123456',
      hayyaExpiry: threeWeeksFromNow,
      verificationToken: 'demo-token-2',
      createdById: staff.id,
      approvedById: manager.id,
      approvedAt: now,
    },
  });
  console.log(`Created accreditation: ${accreditation2.firstName} ${accreditation2.lastName}`);

  const accreditation3 = await prisma.accreditation.upsert({
    where: { verificationToken: 'demo-token-3' },
    update: {},
    create: {
      accreditationNumber: 'DEMO-2024-0003',
      projectId: project.id,
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob.wilson@example.com',
      phone: '+974 5555 1234',
      company: 'Stage Crew Inc',
      role: 'Stage Manager',
      accessGroup: 'Crew',
      status: 'PENDING',
      phases: 'BUMP_IN,LIVE,BUMP_OUT',
      hasBumpInAccess: true,
      hasLiveAccess: true,
      hasBumpOutAccess: true,
      identificationType: 'qid',
      qidNumber: '98765432109',
      qidExpiry: oneYearFromNow,
      verificationToken: 'demo-token-3',
      createdById: staff.id,
    },
  });
  console.log(`Created accreditation: ${accreditation3.firstName} ${accreditation3.lastName} (pending)`);

  console.log('\nSeeding completed!');
  console.log('\nCredentials:');
  console.log('  Admin:     digital@bce.qa / BeC@2036');
  console.log('  Manager:   manager@eventpass.local / admin123');
  console.log('  Staff:     staff@eventpass.local / admin123');
  console.log('  Validator: validator@eventpass.local / admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
