-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "emiratesIdCheckDigitOk" BOOLEAN;
