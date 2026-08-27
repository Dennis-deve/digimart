// DigiMart starter catalog seed — idempotent (safe to run repeatedly).
// Usage: npm run db:seed   (or: node scripts/seed.mjs)
// Inserts/updates products, delivery zones and a welcome coupon.
// NEVER deletes anything.
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // no .env — rely on real environment variables
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Catalog
// Provider rules (strict):
//   BUNDLESHOPGH -> data bundles ONLY
//   MUVIIN       -> airtime, result checkers, selected digital services (NO data)
//   ADMIN        -> physical products, groceries, services
// NOTE for data bundles: fulfillment parses the size from the NAME ("10GB"),
// and network must be MTN | Telecel | AirtelTigo.
// ---------------------------------------------------------------------------
const products = [
  // Data bundles — BundleShopGH
  { id: 'bs-mtn-5gb',  source: 'BUNDLESHOPGH', name: 'MTN 5GB Data Bundle',       network: 'MTN',        category: 'Data Bundles', basePrice: 25,  description: 'Non-expiry MTN data bundle delivered in minutes to any Ghanaian MTN number.' },
  { id: 'bs-mtn-10gb', source: 'BUNDLESHOPGH', name: 'MTN 10GB Data Bundle',      network: 'MTN',        category: 'Data Bundles', basePrice: 43,  description: 'Non-expiry MTN data bundle delivered in minutes to any Ghanaian MTN number.' },
  { id: 'bs-mtn-20gb', source: 'BUNDLESHOPGH', name: 'MTN 20GB Data Bundle',      network: 'MTN',        category: 'Data Bundles', basePrice: 75,  description: 'Non-expiry MTN data bundle delivered in minutes to any Ghanaian MTN number.' },
  { id: 'bs-mtn-40gb', source: 'BUNDLESHOPGH', name: 'MTN 40GB Data Bundle',      network: 'MTN',        category: 'Data Bundles', basePrice: 130, description: 'Non-expiry MTN data bundle delivered in minutes to any Ghanaian MTN number.' },
  { id: 'bs-telecel-10gb', source: 'BUNDLESHOPGH', name: 'Telecel 10GB Data Bundle', network: 'Telecel',   category: 'Data Bundles', basePrice: 40,  description: 'Non-expiry Telecel data bundle delivered in minutes to any Telecel number.' },
  { id: 'bs-telecel-20gb', source: 'BUNDLESHOPGH', name: 'Telecel 20GB Data Bundle', network: 'Telecel',   category: 'Data Bundles', basePrice: 70,  description: 'Non-expiry Telecel data bundle delivered in minutes to any Telecel number.' },
  { id: 'bs-at-10gb',  source: 'BUNDLESHOPGH', name: 'AirtelTigo 10GB Data Bundle', network: 'AirtelTigo', category: 'Data Bundles', basePrice: 38,  description: 'Non-expiry AirtelTigo data bundle delivered in minutes to any AT number.' },
  { id: 'bs-at-20gb',  source: 'BUNDLESHOPGH', name: 'AirtelTigo 20GB Data Bundle', network: 'AirtelTigo', category: 'Data Bundles', basePrice: 65,  description: 'Non-expiry AirtelTigo data bundle delivered in minutes to any AT number.' },

  // Airtime — Muviin (category must contain "airtime" for fulfilment)
  { id: 'mu-airtime-mtn-5',  source: 'MUVIIN', name: 'MTN Airtime GH₵5',  network: 'MTN', category: 'Airtime', basePrice: 5,  description: 'Instant MTN airtime top-up delivered after payment verification.' },
  { id: 'mu-airtime-10',     source: 'MUVIIN', name: 'MTN Airtime GH₵10', network: 'MTN', category: 'Airtime', basePrice: 10, description: 'Instant MTN airtime top-up delivered after payment verification.' },
  { id: 'mu-airtime-mtn-20', source: 'MUVIIN', name: 'MTN Airtime GH₵20', network: 'MTN', category: 'Airtime', basePrice: 20, description: 'Instant MTN airtime top-up delivered after payment verification.' },
  { id: 'mu-airtime-telecel-10', source: 'MUVIIN', name: 'Telecel Airtime GH₵10', network: 'Telecel', category: 'Airtime', basePrice: 10, description: 'Instant Telecel airtime top-up delivered after payment verification.' },
  { id: 'mu-airtime-at-10',  source: 'MUVIIN', name: 'AirtelTigo Airtime GH₵10', network: 'AirtelTigo', category: 'Airtime', basePrice: 10, description: 'Instant AirtelTigo airtime top-up delivered after payment verification.' },

  // Result checkers & digital services — Muviin (no data bundles here)
  { id: 'mu-wassce-checker', source: 'MUVIIN', name: 'WASSCE Results Checker',  network: null, category: 'Result Checkers', basePrice: 28, description: 'WAEC WASSCE result checker voucher. Your code is delivered after payment verification.' },
  { id: 'mu-bece-checker',   source: 'MUVIIN', name: 'BECE Results Checker',    network: null, category: 'Result Checkers', basePrice: 25, description: 'WAEC BECE result checker voucher. Your code is delivered after payment verification.' },
  { id: 'mu-netflix-premium',   source: 'MUVIIN', name: 'Netflix Premium 1 Month',   network: null, category: 'Streaming & Subscriptions', basePrice: 55, description: 'Netflix Premium subscription package fulfilled after confirmed payment.' },
  { id: 'mu-netflix-standard',  source: 'MUVIIN', name: 'Netflix Standard 1 Month',  network: null, category: 'Streaming & Subscriptions', basePrice: 45, description: 'Netflix Standard subscription package fulfilled after confirmed payment.' },

  // Physical products & groceries — ADMIN source
  { id: 'admin-earbuds',   source: 'ADMIN', name: 'Oraimo FreePods Wireless Earbuds', network: null, category: 'Electronics', basePrice: 180, description: 'True wireless earbuds with charging case. Delivered by a verified DigiMart seller.' },
  { id: 'admin-powerbank', source: 'ADMIN', name: '20000mAh Power Bank',             network: null, category: 'Electronics', basePrice: 220, description: 'Fast-charging 20000mAh power bank. Delivered by a verified DigiMart seller.' },
  { id: 'admin-charger',   source: 'ADMIN', name: 'USB-C Fast Charger 25W',          network: null, category: 'Electronics', basePrice: 65,  description: 'Original USB-C fast charger. Delivered by a verified DigiMart seller.' },
  { id: 'admin-rice-5kg',  source: 'ADMIN', name: 'Perfumed Rice 5kg',               network: null, category: 'Groceries', basePrice: 120, description: 'Premium quality perfumed rice, 5kg bag. Same-day delivery in select zones.' },
  { id: 'admin-grocery-pack', source: 'ADMIN', name: 'Family Essentials Grocery Pack', network: null, category: 'Groceries', basePrice: 150, description: 'Starter grocery pack: cooking oil, tomatoes, onions, spices and more.' },

  // Services — ADMIN source
  { id: 'admin-repair-booking', source: 'ADMIN', name: 'Device Diagnosis & Repair Booking', network: null, category: 'Services', basePrice: 30, description: 'Book a verified technician to diagnose your phone or laptop. Pay the diagnosis fee here.' },
];

// Delivery zones — needed for physical checkout (DELIVERY/PICKUP)
const zones = [
  { id: 'zone-accra-metro', name: 'Accra Metropolitan', city: 'Accra',     baseFee: 15, minimumOrder: 300, estimatedMinutes: 60,  pickupAvailable: true },
  { id: 'zone-tema',        name: 'Tema',               city: 'Tema',      baseFee: 20, minimumOrder: 350, estimatedMinutes: 90,  pickupAvailable: true },
  { id: 'zone-kasoa',       name: 'Kasoa / Awutu',      city: 'Kasoa',     baseFee: 25, minimumOrder: null, estimatedMinutes: 120, pickupAvailable: true },
  { id: 'zone-kumasi-metro',name: 'Kumasi Metropolitan',city: 'Kumasi',    baseFee: 20, minimumOrder: 350, estimatedMinutes: 90,  pickupAvailable: true },
  { id: 'zone-takoradi',    name: 'Takoradi',           city: 'Takoradi',  baseFee: 30, minimumOrder: null, estimatedMinutes: 180, pickupAvailable: false },
];

// Welcome coupon
const coupons = [
  { id: 'coupon-welcome5', code: 'WELCOME5', discountType: 'FIXED', discountValue: 5, minimumOrder: 20, usageLimit: null },
];

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('sslmode') ? false : { rejectUnauthorized: false } });
await client.connect();

let productCount = 0;
for (const p of products) {
  await client.query(
    `INSERT INTO "Product" (id, source, "sourceProductId", name, description, network, category, "basePrice", images, "inStock", "isExcluded", "variablePrice", "minAmount", "maxAmount", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}',true,false,false,NULL,NULL,now(),now())
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, network=EXCLUDED.network, category=EXCLUDED.category, "basePrice"=EXCLUDED."basePrice", "inStock"=true, "updatedAt"=now()`,
    [p.id, p.source, p.id, p.name, p.description, p.network, p.category, p.basePrice]
  );
  productCount++;
}

let zoneCount = 0;
for (const z of zones) {
  await client.query(
    `INSERT INTO "DeliveryZone" (id, name, city, "baseFee", "minimumOrder", "estimatedMinutes", "pickupAvailable", active, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,now())
     ON CONFLICT (name) DO UPDATE SET city=EXCLUDED.city, "baseFee"=EXCLUDED."baseFee", "minimumOrder"=EXCLUDED."minimumOrder", "estimatedMinutes"=EXCLUDED."estimatedMinutes", "pickupAvailable"=EXCLUDED."pickupAvailable", active=true`,
    [z.id, z.name, z.city, z.baseFee, z.minimumOrder, z.estimatedMinutes, z.pickupAvailable]
  );
  zoneCount++;
}

let couponCount = 0;
for (const c of coupons) {
  await client.query(
    `INSERT INTO "Coupon" (id, code, "discountType", "discountValue", "minimumOrder", "usageLimit", "usageCount", "startsAt", "endsAt", active, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,0,NULL,NULL,true,now())
     ON CONFLICT (code) DO UPDATE SET "discountType"=EXCLUDED."discountType", "discountValue"=EXCLUDED."discountValue", "minimumOrder"=EXCLUDED."minimumOrder", active=true`,
    [c.id, c.code, c.discountType, c.discountValue, c.minimumOrder, c.usageLimit]
  );
  couponCount++;
}

const counts = await client.query('SELECT (SELECT COUNT(*) FROM "Product") AS products, (SELECT COUNT(*) FROM "DeliveryZone") AS zones, (SELECT COUNT(*) FROM "Coupon") AS coupons');
console.log(`Seed complete (idempotent upserts): ${productCount} products processed, ${zoneCount} zones, ${couponCount} coupon.`);
console.log(`Database now holds: ${counts.rows[0].products} products, ${counts.rows[0].zones} delivery zones, ${counts.rows[0].coupons} coupons.`);
await client.end();
