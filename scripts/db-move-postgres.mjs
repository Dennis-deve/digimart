// Move the DigiMart PostgreSQL database (schema + all data) from one server to another.
// Built for Neon -> Railway, works for any Postgres -> Postgres move.
//
//   SOURCE:  DB_MOVE_FROM   (defaults to DATABASE_URL in .env — i.e. your current Neon DB)
//   TARGET:  DB_MOVE_TO     (REQUIRED — the new Railway DATABASE_URL)
//
// Usage:  DB_MOVE_TO="postgresql://postgres:PASS@...railway...:5432/railway" npm run db:move
// Safety: NEVER writes to the source. Refuses to overwrite a target that already has data (use --force to allow).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

const SOURCE_URL = process.env.DB_MOVE_FROM || process.env.DATABASE_URL;
const TARGET_URL = process.env.DB_MOVE_TO;
const FORCE = process.argv.includes('--force');
if (!TARGET_URL) { console.error('Set DB_MOVE_TO to the destination PostgreSQL URL (Railway: Postgres service -> Connect -> Database URL).'); process.exit(1); }
if (!SOURCE_URL) { console.error('Set DB_MOVE_FROM (or DATABASE_URL) to the source database URL.'); process.exit(1); }
if (SOURCE_URL === TARGET_URL) { console.error('Source and target are the same URL — nothing to do.'); process.exit(1); }

async function connect(url, label) {
  // Newer pg drivers treat sslmode=require as verify-full, which fails on Railway's
  // self-signed proxy chain. Try several safe combinations until one connects.
  const variants = [
    { url, ssl: undefined },
    { url: url.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } },
    { url: url.replace(/[?&]sslmode=[^&]*/g, ''), ssl: false },
    { url: url.replace(/[?&]sslmode=[^&]*/g, ''), ssl: { rejectUnauthorized: false } },
  ];
  let lastError;
  for (const v of variants) {
    try {
      const cfg = { connectionString: v.url, connectionTimeoutMillis: 15000 };
      if (v.ssl !== undefined) cfg.ssl = v.ssl;
      const c = new Client(cfg); await c.connect(); return c;
    } catch (e) { lastError = e; }
  }
  console.error(`Could not connect to ${label}: ${lastError.message}`); process.exit(1);
}

// Copy order: parents before children (also relaxed with session_replication_role below).
const TABLES = ['User', 'Announcement', 'PlatformSettings', 'Product', 'Seller', 'Reseller', 'Rider', 'DeliveryZone', 'Coupon', 'ResellerProductMarkup', 'CustomerAddress', 'Order', 'OrderItem', 'Delivery', 'Payout', 'Refund', 'Notification', 'SupportTicket', 'SupportMessage', 'Review', 'Wallet', 'WalletEntry', 'AuditLog', 'PushSubscription'];

const source = await connect(SOURCE_URL, 'SOURCE (old database)');
const target = await connect(TARGET_URL, 'TARGET (new Railway database)');

// 1) Safety: refuse non-empty target unless --force
const existing = await target.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\' AND table_type=\'BASE TABLE\'');
if (existing.rowCount > 0) {
  let rows = 0;
  for (const t of existing.rows) { const c = await target.query(`SELECT COUNT(*)::int AS n FROM "${t.table_name}"`); rows += c.rows[0].n; }
  if (rows > 0 && !FORCE) { console.error(`Target already has ${existing.rowCount} table(s) with ${rows} row(s). Re-run with --force to wipe and re-copy (only the TARGET is wiped).`); process.exit(1); }
  if (FORCE) {
    console.log('Wiping target tables (source is untouched)...');
    await target.query('SET session_replication_role = replica');
    for (const t of existing.rows) await target.query(`TRUNCATE TABLE "${t.table_name}" CASCADE`);
    await target.query('SET session_replication_role = DEFAULT');
  }
}

// 2) Create schema on the target from the live Prisma schema (source stays untouched)
console.log('Creating schema on target via `prisma db push` (fresh/empty target only)...');
const targetForPrisma = TARGET_URL.replace('sslmode=require', 'sslmode=no-verify');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: targetForPrisma } });

// 3) Copy all rows, source -> target
await target.query('SET session_replication_role = replica');
let copied = 0, skipped = 0;
for (const table of TABLES) {
  const exists = await source.query('SELECT 1 FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=$1', [table]);
  if (exists.rowCount === 0) { console.log(`  SKIP ${table} (not in source)`); skipped++; continue; }
  const { rows } = await source.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) { console.log(`  ${String(table).padEnd(24)} 0 rows`); continue; }
  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `"${c}"`).join(',');
  for (const row of rows) {
    const values = cols.map(c => {
      const v = row[c];
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) return JSON.stringify(v);
      return v;
    });
    await target.query(`INSERT INTO "${table}" (${colList}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`, values);
  }
  copied += rows.length;
  console.log(`  ${String(table).padEnd(24)} ${rows.length} rows`);
}
await target.query('SET session_replication_role = DEFAULT');

// 4) Verify
const sourceCount = await source.query('SELECT (SELECT COUNT(*) FROM "User") users, (SELECT COUNT(*) FROM "Product") products, (SELECT COUNT(*) FROM "Order") orders');
const targetCount = await target.query('SELECT (SELECT COUNT(*) FROM "User") users, (SELECT COUNT(*) FROM "Product") products, (SELECT COUNT(*) FROM "Order") orders');
console.log(`\nCopied ${copied} rows (${skipped} table(s) skipped).`);
console.log(`SOURCE: ${JSON.stringify(sourceCount.rows[0])}`);
console.log(`TARGET: ${JSON.stringify(targetCount.rows[0])}`);
console.log('\nNext steps:');
console.log('  1. In Railway, set the app service DATABASE_URL to the Postgres variable reference: ${{Postgres.DATABASE_URL}}');
console.log('  2. Redeploy the app, then check /api/health/database.');
console.log('  3. Keep Neon paused as a backup until you are satisfied, then delete it.');
await source.end(); await target.end();
