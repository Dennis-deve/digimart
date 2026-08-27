// Set (or view) a DigiMart user role directly in the database.
// Usage:
//   node scripts/set-role.mjs                       -> list users + roles
//   node scripts/set-role.mjs 0544216532 ADMIN      -> set role
//   node scripts/set-role.mjs 0544216532 CUSTOMER   -> revert role
// Safe: only updates the "role" column of "User" rows matching the phone.
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

const ALLOWED = ['CUSTOMER', 'RESELLER', 'ADMIN', 'SELLER', 'RIDER', 'SUPPORT'];
loadEnv();

const [, , phoneArg, roleArg] = process.argv;

if (roleArg && !ALLOWED.includes(roleArg.toUpperCase())) {
  console.error(`Invalid role "${roleArg}". Allowed: ${ALLOWED.join(', ')}`);
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('sslmode') ? false : { rejectUnauthorized: false } });
await client.connect();

const list = await client.query('SELECT id, phone, email, role, "createdAt" FROM "User" ORDER BY "createdAt"');
console.log('Users in database:');
for (const u of list.rows) console.log(`  ${u.id}  ${u.phone}  role=${u.role}  email=${u.email ?? '-'}`);

if (phoneArg && roleArg) {
  const role = roleArg.toUpperCase();
  const before = list.rows.find(u => u.phone === phoneArg);
  if (!before) { console.error(`\nNo user found with phone ${phoneArg}. Nothing changed.`); process.exit(1); }
  const res = await client.query('UPDATE "User" SET role = $1 WHERE phone = $2 RETURNING id, phone, role', [role, phoneArg]);
  console.log(`\nUpdated: ${res.rows[0].phone} role ${before.role} -> ${res.rows[0].role}`);
  console.log('Remember: the user must log out and log back in for the new role to take effect (role is stored in the session JWT).');
}

await client.end();
