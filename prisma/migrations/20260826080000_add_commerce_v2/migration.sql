-- Commerce V2: buyer-pays payment fee, payout accounts, seller assignment, reviews, support threads
-- All statements idempotent and additive. No drops, no data changes.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddressSnapshot" JSONB;

ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "payoutName" TEXT;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "payoutMomo" TEXT;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "payoutNetwork" TEXT;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "earningsBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "Reseller" ADD COLUMN IF NOT EXISTS "payoutName" TEXT;
ALTER TABLE "Reseller" ADD COLUMN IF NOT EXISTS "payoutMomo" TEXT;
ALTER TABLE "Reseller" ADD COLUMN IF NOT EXISTS "payoutNetwork" TEXT;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellerId" TEXT REFERENCES "Seller"("id") ON DELETE SET NULL;

ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "Payout" ALTER COLUMN "resellerId" DROP NOT NULL;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "sellerId" TEXT REFERENCES "Seller"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_productId_key" ON "Review"("userId","productId");
CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
  "senderRole" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
