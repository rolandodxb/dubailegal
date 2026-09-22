-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('VIDEO_CALL', 'OFFICE_VISIT', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "AppointmentConfirmation" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUESTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "confirmation" "AppointmentConfirmation" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "mode" "AppointmentMode" NOT NULL DEFAULT 'OFFICE_VISIT',
ADD COLUMN     "officeAddress" TEXT,
ADD COLUMN     "roomCode" TEXT;

-- AlterTable
ALTER TABLE "lawyer_profile" ADD COLUMN     "acceptsEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emergencyNote" TEXT,
ADD COLUMN     "isFirmEmergency" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "emergency_request" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseType" "LegalArea" NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'OPEN',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "legalCaseId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_request" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "purpose" TEXT NOT NULL,
    "details" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REQUESTED',
    "method" "PaymentMethod",
    "reference" TEXT,
    "proofDocumentId" TEXT,
    "paidById" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_signal" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_presence" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emergency_request_status_createdAt_idx" ON "emergency_request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "emergency_request_clientId_status_idx" ON "emergency_request"("clientId", "status");

-- CreateIndex
CREATE INDEX "payment_request_caseId_status_idx" ON "payment_request"("caseId", "status");

-- CreateIndex
CREATE INDEX "payment_request_requestedById_status_idx" ON "payment_request"("requestedById", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");

-- CreateIndex
CREATE INDEX "room_signal_roomCode_createdAt_idx" ON "room_signal"("roomCode", "createdAt");

-- CreateIndex
CREATE INDEX "room_presence_roomCode_idx" ON "room_presence"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "room_presence_roomCode_userId_key" ON "room_presence"("roomCode", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_roomCode_key" ON "appointment"("roomCode");

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_request" ADD CONSTRAINT "emergency_request_legalCaseId_fkey" FOREIGN KEY ("legalCaseId") REFERENCES "legal_case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "legal_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_signal" ADD CONSTRAINT "room_signal_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_presence" ADD CONSTRAINT "room_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

