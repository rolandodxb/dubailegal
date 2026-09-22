-- CreateTable
CREATE TABLE "room_recording" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "appointmentId" TEXT,
    "emergencyRequestId" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_recording_storageKey_key" ON "room_recording"("storageKey");

-- CreateIndex
CREATE INDEX "room_recording_roomCode_createdAt_idx" ON "room_recording"("roomCode", "createdAt");

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_recording" ADD CONSTRAINT "room_recording_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

