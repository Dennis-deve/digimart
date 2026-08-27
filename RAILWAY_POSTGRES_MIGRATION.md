# Move DigiMart from Neon to Railway PostgreSQL — step by step

Everything happens from your Windows PC, in `F:\Project\digimart`. Nothing in this
guide can damage the Neon database — the mover script never writes to the source.

## Step 0 — Prerequisites (2 min)
```powershell
cd F:\Project\digimart
npm install          # if node_modules is missing
```
Confirm the OLD Neon URL is your current `DATABASE_URL` in `.env` (the script copies FROM it).

## Step 1 — Create the Postgres database in Railway (3 min)
1. Open **https://railway.app** → your **digimart** project
2. Click **+ New** (top-right of the canvas) → **Database** → **Add PostgreSQL**
   - A new "Postgres" service appears next to your app
3. Click the **Postgres** service → **Connect** tab
4. You need the **Public Database URL** (from your home PC you cannot reach the internal URL):
   - If you see "Public Database URL" / a TCP proxy section → copy that URL
   - If not, look for **"Public Networking"** toggle → enable it → copy the URL shown
5. It looks like: `postgresql://postgres:AbCdEf...@turntable.proxy.rlwy.net:12345/railway`
   (some plans show `containers-us-...railway.app`)

## Step 2 — Put it in .env (1 min)
In `F:\Project\digimart\.env` add (keep quotes in the file):
```dotenv
DB_MOVE_TO="postgresql://postgres:PASSWORD@...railway.../railway?sslmode=require"
```
(Append `?sslmode=require` if it's not already there.)

## Step 3 — Run the move (2–5 min)
```powershell
npm run db:move
```
You will see:
1. `prisma db push` creating the full schema on the new (empty) database
2. Every table copied with row counts (User, Product, Order, … 24 tables)
3. A SOURCE vs TARGET verification line — the numbers must match

Safety built in:
- Refuses to touch a target that already has data (add `--force` only if you intentionally re-run)
- **Never writes anything to Neon**

## Step 4 — Point the app at the new database (2 min)
1. Railway → your **digimart app service** (not the Postgres one) → **Variables**
2. Replace the `DATABASE_URL` value with the reference:
   ```
   ${{Postgres.DATABASE_URL}}
   ```
   (Railway auto-fills the real URL at deploy time — this survives password changes)
3. Railway redeploys automatically. If not: **Settings → Deployments → Redeploy**

## Step 5 — Verify (1 min)
Open: `https://digimart-production-b330.up.railway.app/api/health/database`
Expected:
```json
{"status":"success","data":{"database":"connected","users":...,"products":...,"orders":...}}
```
Also log in and check `/admin` — your products, orders and users should all be there.

## Step 6 — Update local .env (1 min)
Set the local `DATABASE_URL` to the same Railway **public** URL (for local dev/scripts):
```dotenv
DATABASE_URL="postgresql://postgres:PASSWORD@...railway.../railway?sslmode=require"
```
Remove/comment `DB_MOVE_TO`.

## Step 7 — Retire Neon (when confident)
1. Use the app for a day or two — Neon stays as a live backup (it costs while active)
2. When satisfied: Neon console → **Suspend/Scale to zero** first (free, reversible)
3. Later: delete the Neon project entirely

## Troubleshooting
| Problem | Fix |
|---|---|
| `connection timed out` | You used the INTERNAL URL — use the Public URL (Step 1.4) |
| `no password supplied` / auth failed | Copy the URL again fully; don't URL-decode it |
| `certificate / SSL` error | Ensure `?sslmode=require` at the end of DB_MOVE_TO |
| `Target already has tables with data` | Re-run with: `npm run db:move -- --force` (wipes TARGET only) |
| Health check fails after switch | Variables must be exactly `${{Postgres.DATABASE_URL}}` — check for typos; redeploy |
