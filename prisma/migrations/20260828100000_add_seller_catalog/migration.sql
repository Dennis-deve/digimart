-- Seller-owned catalog: uploads, admin approval, platform listing opt-in, store-context sales
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "onPlatform" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerStoreId" TEXT;
CREATE INDEX IF NOT EXISTS "Product_approvalStatus_idx" ON "Product"("approvalStatus");
