-- Provider products at cost redirect to the provider's own payment page;
-- marked-up products stay on DigiMart checkout (Moolre).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "providerCost" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalCheckoutUrl" TEXT;
