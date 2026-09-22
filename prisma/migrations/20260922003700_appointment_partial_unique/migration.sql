-- DropIndex
DROP INDEX "appointment_lawyerId_startsAt_key";

-- CreateIndex
CREATE INDEX "appointment_lawyerId_startsAt_idx" ON "appointment"("lawyerId", "startsAt");

-- At most one BOOKED meeting per lawyer per slot. Enforced as a partial index
-- rather than a plain unique constraint so that cancelling a meeting frees the
-- slot for re-booking instead of blocking it forever.
CREATE UNIQUE INDEX "appointment_lawyer_slot_booked_key"
  ON "appointment" ("lawyerId", "startsAt")
  WHERE "status" = 'BOOKED';
