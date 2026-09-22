-- CreateEnum
CREATE TYPE "CommunityTopic" AS ENUM ('LABOUR_EMPLOYMENT', 'TENANCY_PROPERTY', 'FAMILY_PERSONAL_STATUS', 'CRIMINAL_PENAL', 'TRAFFIC_FINES', 'VISAS_RESIDENCY', 'BUSINESS_CONTRACTS', 'MONEY_DEBT', 'COURTS_PROCEDURE', 'COSTS_FEES', 'USING_DUBAI_LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BlogModerationReason" AS ENUM ('DUPLICATE', 'NOT_A_LEGAL_TOPIC', 'ABUSIVE', 'ADVERTISING', 'CONFIDENTIAL_DETAIL', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlogPostStatus" ADD VALUE 'PENDING';
ALTER TYPE "BlogPostStatus" ADD VALUE 'DUPLICATE';

-- AlterTable
ALTER TABLE "blog_post" ADD COLUMN     "duplicateOfId" TEXT,
ADD COLUMN     "moderationReason" "BlogModerationReason",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "similarityPostId" TEXT,
ADD COLUMN     "similarityScore" DOUBLE PRECISION,
ADD COLUMN     "similarityTerms" TEXT,
ADD COLUMN     "topic" "CommunityTopic" NOT NULL DEFAULT 'OTHER',
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "blog_post_status_topic_idx" ON "blog_post"("status", "topic");

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "blog_post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

