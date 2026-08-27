# Fixing Prisma P1013 "the scheme is not recognized"

## What the error actually meant

```
Error: P1013
The provided database string is invalid. The scheme is not recognized in database URL.
...
`datasource.url` in `prisma.config.ts` is invalid: must start with the protocol `postgresql://`
```

This does **not** mean the URL had bad characters or bad quoting. `prisma.config.ts` does:

```ts
datasource: { url: env('DATABASE_URL') }
```

When `DATABASE_URL` is **undefined or empty**, `env()` yields an empty string, and Prisma reports
it as "no recognized scheme". The real cause was that **`.env` was not present in the project
folder**. `.env` is git-ignored and excluded from the ZIP, so moving the project from
`F:\digimart` to `F:\Project\digimart` left it behind.

`npx prisma generate` still succeeded in that state because generating the client needs no
database — which is why the failure looked confusing.

Double quotes around values are fine; dotenv strips one matching outer pair. An absent file is
the problem, not the quoting.

## The fix

1. Create `.env` in the project root (copy `.env.template`).
2. Put the pooled Neon string in `DATABASE_URL`, starting with `postgresql://`.
3. `npm install`
4. `npm run db:check` — read-only. Shows connection, server version, table list, and whether
   anything is missing. Makes no changes.
5. `npm run db:apply` — applies only the missing migrations, one transaction per migration,
   records each in `_prisma_migrations`. Never drops anything.

Or simply: `.\scripts\fix-db.ps1` which does 3–5 for you.

`scripts/db-check.mjs` has no npm dependencies beyond `pg` (already a project dependency) and
reads `.env` itself, so it does not need `dotenv` and does not need a working Prisma config to
tell you what is wrong.

## Status as of this run

Executed against the live Neon database:

- Connection: OK, PostgreSQL 18.6
- Before: 10 tables (`Announcement, Order, OrderItem, Payout, PlatformSettings, Product, Reseller, ResellerProductMarkup, User, _prisma_migrations`)
- All 11 migrations applied successfully
- After: 22 tables (21 models + `_prisma_migrations`) — `schema state: complete`
- `Role` enum now: `CUSTOMER, RESELLER, ADMIN, SELLER, RIDER, SUPPORT`
- New `Order` columns present: `couponCode, discount, deliveryZoneId, deliveryMethod, deliveryFee, deliveryAddressId`
- Row counts: users 1, products 0, orders 0, everything else 0

Do **not** run `npx prisma db pull` now — it rewrites `schema.prisma` from the database and can
drop relation names the app code relies on. `schema.prisma` already matches the database.

## Railway: separate problem, same symptom

`https://digimart-production-b330.up.railway.app/api/health/database` returning
`{"status":"error","message":"Database connection failed."}` is the *deployed* service not
having `DATABASE_URL`. Fixing the local `.env` does not affect Railway.

In Railway → your service → **Variables**, set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the full pooled Neon string, raw, **no surrounding quotes** |
| `JWT_SECRET` | long random string |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://digimart-production-b330.up.railway.app` |
| `MOOLRE_*`, `BUNDLESHOPGH_*`, `MUVIIN_API_KEY`, `CLOUDINARY_*`, `JOBS_TOKEN`, `ADMIN_RECOVERY_KEY` | as in `.env` |

Then **Redeploy** and open `/api/health/database` again.

Build command: `npm install && npx prisma generate && npm run build`
Start command: `npm run start` — do not hardcode `PORT`; Railway injects it.

If it still fails, the Railway **deploy logs** will name the real cause:
`password authentication failed` (rotated Neon password), `DATABASE_URL is not defined`
(variable not set), or a timeout (wrong host).

## Security

Every secret previously pasted into chat is compromised: the Neon password, `JWT_SECRET`,
Moolre pubkey, BundleShopGH key and webhook token, Muviin key, Cloudinary secret,
`ADMIN_RECOVERY_KEY`, `JOBS_TOKEN`. Rotate all of them before accepting real payments, then
update both `.env` and the Railway variables.
