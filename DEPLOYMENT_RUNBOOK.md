# DigiMart Deployment & VS Code Runbook

## 1. Important security action first

This project contains `.env` locally for development only. **Do not commit or upload `.env`.** Rotate every credential that was previously shared in chat before production, including the database password, Moolre keys, Cloudinary secret, BundleShopGH key, Muviin key, JWT secret, webhook tokens, and admin recovery key.

## 2. Open locally in VS Code

```bash
unzip digimart-project.zip
cd digimart
code .
npm install
npx prisma generate
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`.

## 3. Environment variables

Create `.env` from `.env.example`. Use server-side environment variables only. Never prefix payment/provider secrets with `NEXT_PUBLIC_`.

Required:

```dotenv
DATABASE_URL="postgresql://..."
JWT_SECRET="long-random-production-secret"
APP_URL="https://YOUR_PUBLIC_DOMAIN"
MOOLRE_BASE_URL="https://api.moolre.com"
MOOLRE_API_USER=""
MOOLRE_API_PUBKEY=""
MOOLRE_ACCOUNT_NUMBER=""
MOOLRE_WEBHOOK_TOKEN="long-random-callback-token"
BUNDLESHOPGH_BASE_URL="https://backend.mycledanet.com"
BUNDLESHOPGH_API_KEY=""
BUNDLESHOPGH_WEBHOOK_TOKEN="long-random-callback-token"
MUVIIN_API_KEY=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
JOBS_TOKEN="long-random-job-token"
```

Optional:

```dotenv
STORAGE_DRIVER="cloudinary"
ADMIN_RECOVERY_KEY="long-random-emergency-secret"
```

## 4. Database migrations

The project uses safe additive SQL migrations under `prisma/migrations/`. Existing Neon tables must not be reset.

For a fresh database, run each SQL migration in chronological order using Prisma:

```bash
npx prisma db execute --file prisma/migrations/20260823010000_add_support_ticket/migration.sql
npx prisma db execute --file prisma/migrations/20260823011000_add_wallet_ledger/migration.sql
npx prisma db execute --file prisma/migrations/20260823012000_add_seller_delivery/migration.sql
npx prisma db execute --file prisma/migrations/20260823013000_add_platform_roles/migration.sql
npx prisma db execute --file prisma/migrations/20260823014000_add_refunds/migration.sql
npx prisma db execute --file prisma/migrations/20260823015000_add_notifications/migration.sql
npx prisma db execute --file prisma/migrations/20260823016000_add_coupons/migration.sql
npx prisma db execute --file prisma/migrations/20260823017000_add_order_coupon_fields/migration.sql
npx prisma db execute --file prisma/migrations/20260823018000_add_audit_log/migration.sql
npx prisma db pull
npx prisma generate
```

Do **not** run `prisma migrate reset` against production.

## 5. Railway deployment

1. Create a GitHub repository from this folder, excluding `.env`.
2. Create a Railway project and choose **Deploy from GitHub Repo**.
3. Set the service root directory to `digimart` if this project is in a monorepo; otherwise use the repository root.
4. Railway build command:

```bash
npm install && npx prisma generate && npm run build
```

5. Railway start command:

```bash
npm run start -- --hostname 0.0.0.0
```

6. Add all production variables from Section 3 in Railway Variables.
7. Set `APP_URL` to Railway's generated HTTPS domain or your custom HTTPS domain.
8. Deploy, then check:

```text
https://YOUR_DOMAIN/api/health/database
```

Expected result: `database: connected`.

## 6. Render deployment

1. Create a new **Web Service** from the GitHub repository.
2. Runtime: Node.
3. Build command:

```bash
npm install && npx prisma generate && npm run build
```

4. Start command:

```bash
npm run start -- --hostname 0.0.0.0
```

5. Add all variables from Section 3 in Render Environment.
6. Set `APP_URL` to the generated Render HTTPS URL or custom domain.
7. Add a Render Cron Job for pending Muviin items every five minutes:

```bash
curl -X POST "$APP_URL/api/jobs/recheck-muviin" -H "Authorization: Bearer $JOBS_TOKEN"
```

## 7. Configure provider callbacks after deployment

### Moolre

Configure the Moolre callback URL as:

```text
https://YOUR_DOMAIN/api/webhooks/moolre?token=YOUR_MOOLRE_WEBHOOK_TOKEN
```

Moolre must have API access enabled. The prior `AIN01` result means credentials/account API access need confirmation before charging customers.

### BundleShopGH

DigiMart sends this callback when placing bundle orders:

```text
https://YOUR_DOMAIN/api/webhooks/bundleshopgh?token=YOUR_BUNDLESHOPGH_WEBHOOK_TOKEN
```

Confirm the actual BundleShopGH callback JSON/status values with one controlled provider test.

## 8. Scheduled work

Schedule every five minutes:

```text
POST /api/jobs/recheck-muviin
Authorization: Bearer JOBS_TOKEN
```

This checks pending Muviin airtime records. Configure a platform cron job, not a browser call.

## 9. Essential VS Code test sequence

1. `npm install`
2. `npx prisma generate`
3. `npm run lint`
4. `npm run build`
5. `npm run dev`
6. Test `/api/health/database`.
7. Register a customer and sign in.
8. Test cart persistence and checkout request.
9. Test coupon validation.
10. Test wallet and notification pages.
11. Test reseller application and admin approval using an admin account.
12. Test support ticket submission.
13. Test physical delivery/rider APIs with seeded roles.
14. Test live Moolre only after Moolre fixes API authentication.

## 10. Production go-live checklist

- Rotate all exposed secrets.
- Create an ADMIN user securely in PostgreSQL.
- Enable Moolre API collection permissions.
- Register Moolre webhook URL.
- Configure BundleShopGH callback.
- Add real Muviin key and run airtime test.
- Add Cloudinary production credentials.
- Configure backups on Neon.
- Configure error monitoring and uptime monitoring.
- Verify Moolre payment success, failure, duplicate callback, and delayed callback.
- Verify provider delivery/failure callbacks.
- Verify Android/iPhone and slow-network behavior.
- Publish policies: terms, privacy, refunds, delivery, seller, reseller.

## 11. Known limitations

The code is production-oriented but live payment/provider behaviour cannot be verified without approved external credentials, provider dashboard setup, a public HTTPS callback domain, and controlled transactions. Do not expose payment/provider secrets in frontend code.
