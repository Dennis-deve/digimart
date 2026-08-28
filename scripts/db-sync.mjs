// Applies EVERY migration under prisma/migrations to the DATABASE_URL database.
// All migrations are idempotent (IF NOT EXISTS / ADD VALUE IF NOT EXISTS).
// PHILOSOPHY: this is a SAFETY NET — it must NEVER break a build or deploy.
// Any problem (connection, SSL, statement) is logged as a warning and the script
// still exits 0. Nothing here can take the platform down.
// Usage: npm run db:sync
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv();

const warn = (m) => console.log(`⚠ db:sync: ${m}`);
process.on('uncaughtException', (e) => { warn(`unexpected error — continuing: ${e.message}`); });
process.on('unhandledRejection', (e) => { warn(`unexpected rejection — continuing: ${String(e)}`); });

if (!process.env.DATABASE_URL) { warn('DATABASE_URL not set — skipping (nothing to do here).'); process.exit(0); }

let dir;
try {
  dir = new URL('../prisma/migrations', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  readdirSync(dir);
} catch {
  try { dir = join(process.cwd(), 'prisma', 'migrations'); readdirSync(dir); }
  catch { warn('prisma/migrations folder not found — skipping.'); process.exit(0); }
}

const files = readdirSync(dir).filter(f => /^\d+_.+/.test(f)).sort();

// Railway internal URLs may not accept SSL; Neon/Railway public proxies need relaxed SSL.
// Try several modes until one connects.
async function connect() {
  const url = process.env.DATABASE_URL;
  const variants = [
    { url, ssl: undefined },
    { url, ssl: { rejectUnauthorized: false } },
    { url: url.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } },
    { url: url.replace(/[?&]sslmode=[^&]*/g, ''), ssl: false },
  ];
  let lastError;
  for (const v of variants) {
    try {
      const cfg = { connectionString: v.url, connectionTimeoutMillis: 10000 };
      if (v.ssl !== undefined) cfg.ssl = v.ssl;
      const c = new Client(cfg);
      await c.connect();
      return c;
    } catch (e) { lastError = e; }
  }
  throw lastError;
}

let client;
try { client = await connect(); }
catch (e) { warn(`could not connect to the database — SKIPPING migrations (deploy continues): ${e.message}`); process.exit(0); }

let filesOk = 0, statements = 0, failed = 0;
for (const f of files) {
  let sql;
  try { sql = readFileSync(join(dir, f, 'migration.sql'), 'utf8'); }
  catch { warn(`cannot read ${f} — skipping file.`); continue; }
  const parts = sql.split(/;\s*\r?\n/).map(p => p.replace(/^(--[^\n]*\n)+/s, '').trim()).filter(Boolean);
  let fileOk = true;
  for (const stmt of parts) {
    try { await client.query(stmt); statements++; }
    catch (e) { failed++; fileOk = false; warn(`${f}: "${e.message.split('\n')[0]}" (statement skipped — usually means it is already applied or not applicable)`); }
  }
  if (fileOk) { filesOk++; console.log(`✓ ${f}`); }
}
try {
  const t = await client.query("SELECT COUNT(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  console.log(`\ndb:sync done: ${filesOk}/${files.length} migration files fully clean, ${statements} statements applied, ${failed} skipped. Public tables: ${t.rows[0].n}.`);
} catch { console.log(`\ndb:sync done: ${filesOk}/${files.length} files, ${statements} statements, ${failed} skipped.`); }
await client.end().catch(() => undefined);
process.exit(0);
