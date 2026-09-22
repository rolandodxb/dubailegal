-- CreateEnum
CREATE TYPE "ReceiptLayout" AS ENUM ('STANDARD', 'CUSTOM');

-- AlterEnum
ALTER TYPE "DocumentKind" ADD VALUE 'BRAND_LOGO';

-- CreateTable
CREATE TABLE "receipt_template" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" "ReceiptLayout" NOT NULL DEFAULT 'STANDARD',
    "brandName" TEXT,
    "headerLine" TEXT,
    "footerNote" TEXT,
    "accentColor" TEXT,
    "logoDocumentId" TEXT,
    "showLicence" BOOLEAN NOT NULL DEFAULT true,
    "showFirm" BOOLEAN NOT NULL DEFAULT true,
    "showContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipt_template_userId_key" ON "receipt_template"("userId");

-- AddForeignKey
ALTER TABLE "receipt_template" ADD CONSTRAINT "receipt_template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

