-- CreateEnum
CREATE TYPE "LegalCaseStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "legal_case" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseType" "LegalArea" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LegalCaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clientId" TEXT NOT NULL,
    "firmId" TEXT,
    "lawyerId" TEXT,
    "listingId" TEXT,
    "actionedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSequence" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "case_file" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_message" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_event" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "LegalCaseStatus",
    "toStatus" "LegalCaseStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "firmId" TEXT,
    "clientId" TEXT NOT NULL,
    "caseId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firm_invitation" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "lawyerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "firm_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_case_reference_key" ON "legal_case"("reference");

-- CreateIndex
CREATE INDEX "legal_case_clientId_status_idx" ON "legal_case"("clientId", "status");

-- CreateIndex
CREATE INDEX "legal_case_status_submittedAt_idx" ON "legal_case"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "legal_case_lawyerId_status_idx" ON "legal_case"("lawyerId", "status");

-- CreateIndex
CREATE INDEX "legal_case_firmId_status_idx" ON "legal_case"("firmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "case_file_storageKey_key" ON "case_file"("storageKey");

-- CreateIndex
CREATE INDEX "case_file_caseId_idx" ON "case_file"("caseId");

-- CreateIndex
CREATE INDEX "case_message_caseId_createdAt_idx" ON "case_message"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "case_status_event_caseId_createdAt_idx" ON "case_status_event"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "appointment_clientId_startsAt_idx" ON "appointment"("clientId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_lawyerId_startsAt_key" ON "appointment"("lawyerId", "startsAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "firm_invitation_tokenHash_key" ON "firm_invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "firm_invitation_firmId_status_idx" ON "firm_invitation"("firmId", "status");

-- CreateIndex
CREATE INDEX "firm_invitation_email_status_idx" ON "firm_invitation"("email", "status");

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_case" ADD CONSTRAINT "legal_case_actionedByUserId_fkey" FOREIGN KEY ("actionedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_file" ADD CONSTRAINT "case_file_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_file" ADD CONSTRAINT "case_file_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_message" ADD CONSTRAINT "case_message_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_message" ADD CONSTRAINT "case_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_event" ADD CONSTRAINT "case_status_event_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_event" ADD CONSTRAINT "case_status_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "firm_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_invitation" ADD CONSTRAINT "firm_invitation_lawyerUserId_fkey" FOREIGN KEY ("lawyerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
