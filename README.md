This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database helper scripts

```powershell
npm run db:check    # verify DATABASE_URL, connection, tables and schema health
npm run db:apply    # apply any missing additive migrations
npm run db:seed     # idempotent starter catalog: 23 products, 5 delivery zones, WELCOME5 coupon (safe to re-run)
npm run db:role     # list users and roles
npm run db:role 0544216532 ADMIN    # promote a user (log out/in afterwards)
npm run db:role 0544216532 CUSTOMER # demote a user
```

Seeding never deletes data — it upserts by product id / zone name / coupon code.
npm run db:unseed  # remove ONLY the starter catalog products (never touches your own products)
```

## Background jobs (Railway cron)

Muviin airtime has no webhook — poll its status API periodically:

1. Railway → your service → Settings → Cron (or a separate cron service)
2. Schedule: `*/5 * * * *`
3. Commands (one cron per line, or two cron entries):
   `curl -X POST -H "Authorization: Bearer $JOBS_TOKEN" https://YOUR-DOMAIN/api/jobs/recheck-muviin`
   `curl -X POST -H "Authorization: Bearer $JOBS_TOKEN" https://YOUR-DOMAIN/api/jobs/recheck-refer2bundle`
   `curl -X POST -H "Authorization: Bearer $JOBS_TOKEN" https://YOUR-DOMAIN/api/jobs/recheck-moolre` (payment status safety net)

Moolre payouts (transfers) need `MOOLRE_API_PRIVKEY` (private key) plus transfer channel codes
(MTN=1 built-in; set `MOOLRE_TRF_TELECEL` / `MOOLRE_TRF_AT` when Moolre confirms them).

## Final setup guides
- **ENV_SETUP_GUIDE.md** — every .env variable, where to get it, and the Railway variable checklist
- **RAILWAY_POSTGRES_MIGRATION.md** — step-by-step Neon → Railway Postgres move (`npm run db:move`)
- **SELLER_RESELLER_FLOW.md** — the seller/reseller/payout lifecycle
- **REFER2BUNDLE_INTEGRATION_NOTES.md** — prepared integration plan (on hold until owner clarification)
