-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AccreditationProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessGroups" TEXT NOT NULL DEFAULT 'General',
    "bumpInStart" TIMESTAMP(3),
    "bumpInEnd" TIMESTAMP(3),
    "liveStart" TIMESTAMP(3),
    "liveEnd" TIMESTAMP(3),
    "bumpOutStart" TIMESTAMP(3),
    "bumpOutEnd" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccreditationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accreditation" (
    "id" TEXT NOT NULL,
    "accreditationNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "role" TEXT,
    "accessGroup" TEXT NOT NULL DEFAULT 'General',
    "photoUrl" TEXT,
    "identificationType" TEXT NOT NULL DEFAULT 'qid',
    "qidNumber" TEXT,
    "qidExpiry" TIMESTAMP(3),
    "passportNumber" TEXT,
    "passportCountry" TEXT,
    "passportExpiry" TIMESTAMP(3),
    "hayyaNumber" TEXT,
    "hayyaExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "phases" TEXT NOT NULL DEFAULT '',
    "hasBumpInAccess" BOOLEAN NOT NULL DEFAULT false,
    "bumpInStart" TIMESTAMP(3),
    "bumpInEnd" TIMESTAMP(3),
    "hasLiveAccess" BOOLEAN NOT NULL DEFAULT false,
    "liveStart" TIMESTAMP(3),
    "liveEnd" TIMESTAMP(3),
    "hasBumpOutAccess" BOOLEAN NOT NULL DEFAULT false,
    "bumpOutStart" TIMESTAMP(3),
    "bumpOutEnd" TIMESTAMP(3),
    "verificationToken" TEXT NOT NULL,
    "qrCode" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accreditation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccreditationHistory" (
    "id" TEXT NOT NULL,
    "accreditationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "notes" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccreditationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccreditationScan" (
    "id" TEXT NOT NULL,
    "accreditationId" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "location" TEXT,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "device" TEXT,
    "ipAddress" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccreditationScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AccreditationProject_code_key" ON "AccreditationProject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Accreditation_accreditationNumber_key" ON "Accreditation"("accreditationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Accreditation_verificationToken_key" ON "Accreditation"("verificationToken");

-- CreateIndex
CREATE INDEX "Accreditation_projectId_idx" ON "Accreditation"("projectId");

-- CreateIndex
CREATE INDEX "Accreditation_verificationToken_idx" ON "Accreditation"("verificationToken");

-- CreateIndex
CREATE INDEX "Accreditation_status_idx" ON "Accreditation"("status");

-- CreateIndex
CREATE INDEX "Accreditation_qidNumber_idx" ON "Accreditation"("qidNumber");

-- CreateIndex
CREATE INDEX "Accreditation_accreditationNumber_idx" ON "Accreditation"("accreditationNumber");

-- CreateIndex
CREATE INDEX "AccreditationHistory_accreditationId_idx" ON "AccreditationHistory"("accreditationId");

-- CreateIndex
CREATE INDEX "AccreditationHistory_performedAt_idx" ON "AccreditationHistory"("performedAt");

-- CreateIndex
CREATE INDEX "AccreditationScan_accreditationId_idx" ON "AccreditationScan"("accreditationId");

-- CreateIndex
CREATE INDEX "AccreditationScan_scannedAt_idx" ON "AccreditationScan"("scannedAt");

-- CreateIndex
CREATE INDEX "AccreditationScan_scannedById_idx" ON "AccreditationScan"("scannedById");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationProject" ADD CONSTRAINT "AccreditationProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accreditation" ADD CONSTRAINT "Accreditation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AccreditationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accreditation" ADD CONSTRAINT "Accreditation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accreditation" ADD CONSTRAINT "Accreditation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accreditation" ADD CONSTRAINT "Accreditation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationHistory" ADD CONSTRAINT "AccreditationHistory_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "Accreditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationHistory" ADD CONSTRAINT "AccreditationHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationScan" ADD CONSTRAINT "AccreditationScan_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "Accreditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationScan" ADD CONSTRAINT "AccreditationScan_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
