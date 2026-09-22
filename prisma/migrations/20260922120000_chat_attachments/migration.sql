-- CreateTable
CREATE TABLE "case_message_attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_message_attachment_storageKey_key" ON "case_message_attachment"("storageKey");

-- CreateIndex
CREATE INDEX "case_message_attachment_messageId_idx" ON "case_message_attachment"("messageId");

-- AddForeignKey
ALTER TABLE "case_message_attachment" ADD CONSTRAINT "case_message_attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "case_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

