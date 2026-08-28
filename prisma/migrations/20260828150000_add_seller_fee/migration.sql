-- Seller registration fee (mirrors reseller flow)
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "registrationFee" DECIMAL(10,2) NOT NULL DEFAULT 30;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "feePaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "feePaymentRef" TEXT;
