-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentKind" ADD VALUE 'NATIONAL_ID';
ALTER TYPE "DocumentKind" ADD VALUE 'RESIDENCE_PERMIT';
ALTER TYPE "DocumentKind" ADD VALUE 'PRACTICE_AUTHORISATION';

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "countryOfBirthCode" TEXT,
ADD COLUMN     "countryOfResidenceCode" TEXT,
ADD COLUMN     "declaresNoResidencePermit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationalityCode" TEXT;

