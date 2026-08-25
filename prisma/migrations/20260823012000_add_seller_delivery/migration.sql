CREATE TABLE IF NOT EXISTS "Seller" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeName" TEXT NOT NULL,
  "storeSlug" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Seller_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Seller_userId_key" UNIQUE ("userId"),
  CONSTRAINT "Seller_storeSlug_key" UNIQUE ("storeSlug")
);
CREATE TABLE IF NOT EXISTS "CustomerAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "Rider" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Rider_userId_key" UNIQUE ("userId")
);
CREATE TABLE IF NOT EXISTS "Delivery" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "riderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "pickupAddress" TEXT,
  "deliveryAddress" TEXT,
  "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Delivery_orderId_key" UNIQUE ("orderId")
);
CREATE INDEX IF NOT EXISTS "Delivery_status_idx" ON "Delivery"("status");
