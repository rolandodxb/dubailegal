-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('SCHEDULED', 'CASE_REQUEST');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('ACCOUNT_ACCESS', 'VERIFICATION', 'CASE_OR_MEETING', 'PAYMENT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'ANSWERED', 'SOLVED');

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "payment_request" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "cardholderName" TEXT,
ADD COLUMN     "proofNote" TEXT,
ADD COLUMN     "proofRequestedAt" TIMESTAMP(3),
ADD COLUMN     "proofSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "receiptIssuedAt" TIMESTAMP(3),
ADD COLUMN     "receiptNumber" TEXT;

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "SupportCategory" NOT NULL DEFAULT 'OTHER',
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "contextPath" TEXT,
    "ownerReadAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "solvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_reference_key" ON "support_ticket"("reference");

-- CreateIndex
CREATE INDEX "support_ticket_status_updatedAt_idx" ON "support_ticket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "support_ticket_userId_updatedAt_idx" ON "support_ticket"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "support_message_ticketId_createdAt_idx" ON "support_message"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_request_receiptNumber_key" ON "payment_request"("receiptNumber");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_solvedById_fkey" FOREIGN KEY ("solvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_message" ADD CONSTRAINT "support_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- An urgent call raised by a client is a room, not a diary entry: it must not
-- occupy a slot in the professional's diary, so the slot guard now applies only
-- to meetings the professional scheduled themselves.
DROP INDEX "appointment_lawyer_slot_booked_key";
CREATE UNIQUE INDEX "appointment_lawyer_slot_booked_key"
  ON "appointment" ("lawyerId", "startsAt")
  WHERE "status" = 'BOOKED' AND "source" = 'SCHEDULED';
