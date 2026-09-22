-- Generalise room participants so somebody can join an emergency room without an
-- account. Written to backfill first, so it is safe whether or not the tables
-- already hold rows.

ALTER TABLE "room_presence" ADD COLUMN "participantKey" TEXT;
UPDATE "room_presence" SET "participantKey" = 'user:' || "userId" WHERE "participantKey" IS NULL;
ALTER TABLE "room_presence" ALTER COLUMN "participantKey" SET NOT NULL;
ALTER TABLE "room_presence" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "room_signal" ADD COLUMN "fromKey" TEXT;
UPDATE "room_signal" SET "fromKey" = 'user:' || "fromUserId" WHERE "fromKey" IS NULL;
ALTER TABLE "room_signal" ALTER COLUMN "fromKey" SET NOT NULL;
ALTER TABLE "room_signal" ALTER COLUMN "fromUserId" DROP NOT NULL;

DROP INDEX IF EXISTS "room_presence_roomCode_userId_key";
CREATE UNIQUE INDEX "room_presence_roomCode_participantKey_key" ON "room_presence"("roomCode", "participantKey");
