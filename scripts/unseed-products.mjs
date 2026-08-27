// Remove the DigiMart STARTER CATALOG seeded by scripts/seed.mjs (products only).
// Deletes ONLY the exact seeded product IDs — your own products are never touched.
// Delivery zones and the WELCOME5 coupon are kept (still needed / useful).
// Usage: npm run db:unseed
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
  } catch {}
}
loadEnv();

// Keep this list in sync with scripts/seed.mjs
const seededIds = [
  'bs-mtn-5gb','bs-mtn-10gb','bs-mtn-20gb','bs-mtn-40gb',
  'bs-telecel-10gb','bs-telecel-20gb','bs-at-10gb','bs-at-20gb',
  'mu-airtime-mtn-5','mu-airtime-10','mu-airtime-mtn-20','mu-airtime-telecel-10','mu-airtime-at-10',
  'mu-wassce-checker','mu-bece-checker','mu-netflix-premium','mu-netflix-standard',
  'admin-earbuds','admin-powerbank','admin-charger','admin-rice-5kg','admin-grocery-pack','admin-repair-booking',
];

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('sslmode') ? false : { rejectUnauthorized: false } });
await client.connect();

// Never delete a product that already has orders — those are referenced by order history.
const ordered = await client.query('SELECT DISTINCT "productId" FROM "OrderItem" WHERE "productId" = ANY($1::text[])', [seededIds]);
const orderedIds = ordered.rows.map(r => r.productId);
const deletable = seededIds.filter(id => !orderedIds.includes(id));

if (deletable.length) {
  const res = await client.query('DELETE FROM "Product" WHERE id = ANY($1::text[]) RETURNING id', [deletable]);
  console.log(`Removed ${res.rows.length} starter catalog product(s).`);
} else {
  console.log('Nothing to remove — all starter products are already gone.');
}
if (orderedIds.length) console.log(`Kept (they have order history, hide them via admin instead): ${orderedIds.join(', ')}`);

const counts = await client.query('SELECT (SELECT COUNT(*) FROM "Product") AS products, (SELECT COUNT(*) FROM "DeliveryZone") AS zones');
console.log(`Database now holds: ${counts.rows[0].products} product(s), ${counts.rows[0].zones} delivery zone(s).`);
await client.end();
