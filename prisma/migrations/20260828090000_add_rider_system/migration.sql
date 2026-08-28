-- Rider system: recruitment, earnings, auto-completion (additive, idempotent)
-- (Payout.userId / Payout.destination were in 20260827200000 on the legacy DB; re-applied here for safety)
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "destination" JSONB;
CREATE INDEX IF NOT EXISTS "Payout_userId_idx" ON "Payout"("userId");
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "earningsBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;
