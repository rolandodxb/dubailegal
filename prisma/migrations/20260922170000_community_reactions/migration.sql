-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('LIKE', 'HEART', 'WOW');

-- CreateTable
CREATE TABLE "blog_reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blogCommentId" TEXT,

    CONSTRAINT "blog_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment_reaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_reaction_postId_idx" ON "blog_reaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_reaction_userId_postId_key" ON "blog_reaction"("userId", "postId");

-- CreateIndex
CREATE INDEX "blog_comment_reaction_commentId_idx" ON "blog_comment_reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_comment_reaction_userId_commentId_key" ON "blog_comment_reaction"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reaction" ADD CONSTRAINT "blog_reaction_blogCommentId_fkey" FOREIGN KEY ("blogCommentId") REFERENCES "blog_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_reaction" ADD CONSTRAINT "blog_comment_reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "blog_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment_reaction" ADD CONSTRAINT "blog_comment_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

