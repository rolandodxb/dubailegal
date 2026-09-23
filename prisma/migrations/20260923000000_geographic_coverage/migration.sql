-- AlterTable
ALTER TABLE "blog_post" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "divisionCode" TEXT;

-- AlterTable
ALTER TABLE "listing" ADD COLUMN     "primaryCountryCode" TEXT,
ADD COLUMN     "primaryDivisionCode" TEXT,
ADD COLUMN     "primaryLocality" TEXT;

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "divisionCode" TEXT,
ADD COLUMN     "locality" TEXT;

-- CreateTable
CREATE TABLE "ListingCoverage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "divisionCode" TEXT,
    "locality" TEXT,
    "areas" "LegalArea"[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingCoverage_listingId_idx" ON "ListingCoverage"("listingId");

-- CreateIndex
CREATE INDEX "ListingCoverage_countryCode_idx" ON "ListingCoverage"("countryCode");

-- CreateIndex
CREATE INDEX "ListingCoverage_countryCode_divisionCode_idx" ON "ListingCoverage"("countryCode", "divisionCode");

-- CreateIndex
CREATE INDEX "ListingCoverage_divisionCode_idx" ON "ListingCoverage"("divisionCode");

-- CreateIndex
CREATE INDEX "blog_post_status_countryCode_idx" ON "blog_post"("status", "countryCode");

-- CreateIndex
CREATE INDEX "listing_published_primaryCountryCode_idx" ON "listing"("published", "primaryCountryCode");

-- CreateIndex
CREATE INDEX "listing_published_primaryDivisionCode_idx" ON "listing"("published", "primaryDivisionCode");

-- AddForeignKey
ALTER TABLE "ListingCoverage" ADD CONSTRAINT "ListingCoverage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

