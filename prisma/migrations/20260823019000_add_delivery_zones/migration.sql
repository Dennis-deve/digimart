CREATE TABLE IF NOT EXISTS "DeliveryZone" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Kumasi',
  "baseFee" DECIMAL(10,2) NOT NULL,
  "minimumOrder" DECIMAL(10,2),
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 60,
  "pickupAvailable" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryZone_name_key" UNIQUE ("name")
);
