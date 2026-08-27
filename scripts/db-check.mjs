#!/usr/bin/env node
/**
 * DigiMart database diagnostic + safe migration runner.
 *
 *   node scripts/db-check.mjs            verify the connection, list tables, show what is missing
 *   node scripts/db-check.mjs --apply    apply only the migrations that are missing (idempotent)
 *
 * Deliberately has ZERO npm dependencies (no dotenv, no prisma client) so it runs
 * even when node_modules is incomplete. It reads .env itself.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations');
const APPLY = process.argv.includes('--apply');

/* ---------- tiny .env parser (dotenv is not a declared dependency) ---------- */
function loadDotEnv() {
  const file = join(ROOT, '.env');
  if (!existsSync(file)) {
    fail(
      'There is no .env file at the project root.\n' +
        `   Expected: ${file}\n` +
        '   Fix: create it (copy .env.template) and put your real DATABASE_URL in it.\n' +
        '   NOTE: .env is git-ignored and is NOT in the ZIP. When you move or copy the\n' +
        '         project folder, .env does not travel with it unless you copy it too.',
    );
  }

  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); // strip UTF-8 BOM (PowerShell 5 does this)
  let found = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    found += 1;
    if (process.env[key] === undefined) {
      process.env[key] = stripQuotes(line.slice(eq + 1).trim());
    }
  }

  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    fail(
      `.env exists and defines ${found} variable(s), but DATABASE_URL is empty or absent.\n` +
        '   This is exactly what produces Prisma error P1013 ("the scheme is not recognized").\n' +
        '   Add a line like:  DATABASE_URL="postgresql://USER:PASS@HOST/db?sslmode=require"',
    );
  }
  return { file, found };
}

function stripQuotes(v) {
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

function fail(message) {
  console.error('\n✖ ' + message + '\n');
  process.exit(1);
}

function mask(url) {
  try {
    const u = new URL(url);
    const user = u.username ? u.username.slice(0, 4) + '…' : '(none)';
    return `${u.protocol}//${user}:****@${u.host}${u.pathname}${u.search}`;
  } catch {
    return url.replace(/:[^:@/]*@/, ':****@');
  }
}

/* ---------- checks ---------- */
const { file: envFile, found: envVarCount } = loadDotEnv();
const url = process.env.DATABASE_URL;

console.log('DigiMart database check');
console.log('  .env           :', envFile, `(${envVarCount} variables)`);
console.log('  DATABASE_URL   :', mask(url));

if (!/^postgres(ql)?:\/\//.test(url)) {
  fail(
    'DATABASE_URL does not start with postgresql:// (or postgres://).\n' +
      '   Common causes: the value is wrapped in the literal word "postgresql" typo, the line was\n' +
      '   pasted without the scheme, or an editor saved it with a stray leading character.',
  );
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  fail(
    'The `pg` package is not installed, so the connection cannot be tested.\n' +
      '   Fix: run  npm install  in the project root, then re-run this script.\n' +
      '   (`pg` is a declared dependency of DigiMart — used by the Prisma adapter too.)',
  );
}

const client = new pg.Client({
  connectionString: url,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
});

let rows;
try {
  await client.connect();
  const version = (await client.query('select version() as v')).rows[0].v;
  rows = (
    await client.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' order by table_name`,
    )
  ).rows.map((r) => r.table_name);
  console.log('  connection     : OK');
  console.log('  server         :', version.split(',')[0]);
  console.log(`  public tables  : ${rows.length}`);
  console.log('  ', rows.join(', ') || '(none — empty database)');
} catch (err) {
  await client.end().catch(() => {});
  const code = err.code ?? 'n/a';
  const hints = {
    '28P01': 'Password authentication failed. The Neon role password was rotated or is wrong.\n             Get a fresh pooled string from Neon → Connection Details → Pooled.',
    '28000': 'Authentication failed (role does not exist / not allowed).',
    ENOTFOUND: 'Host could not be resolved. Check the Neon hostname, or check your DNS/network.',
    ETIMEDOUT: 'Connection timed out. Firewall/ISP blocking outbound 5432, or wrong region host.',
    ECONNREFUSED: 'Connection refused. Wrong host/port, or the Neon endpoint is suspended (auto-suspend).',
    '3D000': 'Database does not exist. Check the /dbname part of the URL (yours should be /neondb).',
  };
  fail(
    `Could not connect (${code}).\n   ${err.message}\n` +
      (hints[code] ? `   Likely cause: ${hints[code]}\n` : '') +
      '   No changes were made to the database.',
  );
}

/* ---------- schema expectation, derived from schema.prisma (never hardcoded) ---------- */
const schemaText = readFileSync(join(ROOT, 'prisma', 'schema.prisma'), 'utf8');
const REQUIRED = [];
{
  // "model Name { ... }" blocks; honour @@map("table") when present.
  const blocks = schemaText.match(/^model\s+(\w+)\s*\{[\s\S]*?^\}/gm) ?? [];
  for (const block of blocks) {
    const name = block.match(/^model\s+(\w+)/)[1];
    const mapped = block.match(/@@map\("([^"]+)"\)/);
    REQUIRED.push(mapped ? mapped[1] : name);
  }
}
const missingModels = REQUIRED.filter((t) => !rows.includes(t));

let orderCols = [];
try {
  orderCols = (
    await client.query(
      `select column_name from information_schema.columns
        where table_schema='public' and table_name='Order'`,
    )
  ).rows.map((r) => r.column_name);
} catch {
  /* table may not exist */
}
for (const col of ['couponCode', 'discount', 'deliveryZoneId', 'deliveryMethod', 'deliveryFee', 'deliveryAddressId']) {
  if (orderCols.length > 0 && !orderCols.includes(col)) missingModels.push(`Order.${col}`);
}

console.log(`  schema models  : ${REQUIRED.length} (from prisma/schema.prisma)`);

const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

console.log(`  migrations on disk: ${dirs.length}`);
if (missingModels.length === 0) {
  console.log('  schema state   : complete — nothing to apply.');
  await client.end();
  console.log('\n✔ Database is reachable and fully migrated.\n');
  process.exit(0);
}

console.log('  missing        :', missingModels.join(', '));

if (!APPLY) {
  await client.end();
  console.log('\n→ Nothing was changed. To apply the missing migrations run:\n');
  console.log('     node scripts/db-check.mjs --apply\n');
  console.log('  (or the PowerShell wrapper:  .\\scripts\\fix-db.ps1)\n');
  process.exit(2);
}

console.log('\nApplying migrations in order…');
for (const dir of dirs) {
  const sqlFile = join(MIGRATIONS_DIR, dir, 'migration.sql');
  let sql;
  try {
    sql = readFileSync(sqlFile, "utf8");
  } catch {
    console.log(`  – ${dir}: no migration.sql, skipped`);
    continue;
  }
  const started = Date.now();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'CREATE TABLE IF NOT EXISTS _prisma_migrations (' +
        'id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, ' +
        'finished_at timestamptz, migration_name varchar(255) NOT NULL, ' +
        'logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), ' +
        'applied_steps_count integer NOT NULL DEFAULT 0)',
    );
    await client.query(
      'INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) ' +
        'VALUES ($1, $2, $3, now(), 1) ON CONFLICT (id) DO NOTHING',
      [randomUUID(), 'manual', dir],
    );
    await client.query('COMMIT');
    console.log(`  ✔ ${dir}  (${Date.now() - started} ms)`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    fail(`Migration ${dir} failed and was rolled back.\n   ${err.message}`);
  }
}

const after = (
  await client.query(
    `select table_name from information_schema.tables where table_schema='public' order by table_name`,
  )
).rows.map((r) => r.table_name);
await client.end();
console.log(`\n✔ Done. public tables now: ${after.length}`);
console.log('  ', after.join(', '));
console.log('\nNext: npx prisma generate   (no db pull needed — schema.prisma already matches)\n');
process.exit(0);
