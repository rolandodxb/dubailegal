-- CreateEnum
CREATE TYPE "BlogPostKind" AS ENUM ('RECOMMENDATION', 'QUESTION', 'NOTE');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "BlogCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateTable
CREATE TABLE "blog_post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "BlogPostKind" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "listingId" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "BlogCommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_vote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment_vote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_status_createdAt_idx" ON "blog_post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "blog_post_status_score_idx" ON "blog_post"("status", "score");

-- CreateIndex
CREATE INDEX "blog_post_listingId_status_idx" ON "blog_post"("listingId", "status");

-- CreateIndex
CREATE INDEX "blog_post_authorId_createdAt_idx" ON "blog_post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_comment_postId_createdAt_idx" ON "blog_comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_vote_postId_idx" ON "blog_vote"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_vote_userId_postId_key" ON "blog_vote"("userId", "postId");

-- CreateIndex
CREATE INDEX "blog_comment_vote_commentId_idx" ON "blog_comment_vote"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_comment_vote_userId_commentId_key" ON "blog_comment_vote"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_vote" ADD CONSTRAINT "blog_vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_vote" ADD CONSTRAINT "blog_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_vote" ADD CONSTRAINT "blog_comment_vote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_vote" ADD CONSTRAINT "blog_comment_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

