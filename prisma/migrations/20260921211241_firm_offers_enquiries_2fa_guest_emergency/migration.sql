-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PASSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'CLAIMED', 'CLOSED');

-- AlterEnum
ALTER TYPE "LegalCaseStatus" ADD VALUE 'DISTRIBUTED';

-- AlterTable
ALTER TABLE "emergency_request" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "guestTokenHash" TEXT,
ADD COLUMN     "roomCode" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "legal_case" ADD COLUMN     "distributedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "twoFactorPassedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "twoFactorEnabledAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "case_offer" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_enquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "caseType" "LegalArea",
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_offer_lawyerId_status_idx" ON "case_offer"("lawyerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "case_offer_caseId_lawyerId_key" ON "case_offer"("caseId", "lawyerId");

-- CreateIndex
CREATE INDEX "public_enquiry_status_createdAt_idx" ON "public_enquiry"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_request_roomCode_key" ON "emergency_request"("roomCode");

-- AddForeignKey
ALTER TABLE "case_offer" ADD CONSTRAINT "case_offer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_offer" ADD CONSTRAINT "case_offer_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "lawyer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_enquiry" ADD CONSTRAINT "public_enquiry_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

