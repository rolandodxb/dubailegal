-- AlterTable
ALTER TABLE "lawyer_profile" ADD COLUMN     "createdByFirmId" TEXT;

-- AddForeignKey
ALTER TABLE "lawyer_profile" ADD CONSTRAINT "lawyer_profile_createdByFirmId_fkey" FOREIGN KEY ("createdByFirmId") REFERENCES "firm_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
