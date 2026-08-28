-- Customer wallet top-ups & withdrawals (additive, idempotent)
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "destination" JSONB;
CREATE INDEX IF NOT EXISTS "Payout_userId_idx" ON "Payout"("userId");
