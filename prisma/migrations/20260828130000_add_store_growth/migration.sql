-- Store growth pack: analytics, store coupons, variants, banners (additive, idempotent)
CREATE TABLE IF NOT EXISTS "StoreStat" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreStat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StoreStat_slug_idx" ON "StoreStat"("slug");
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "storeSlug" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variants" JSONB;
ALTER TABLE "Reseller" ADD COLUMN IF NOT EXISTS "storeBanner" TEXT;
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "storeBanner" TEXT;
