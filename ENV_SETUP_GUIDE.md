# DigiMart — Complete .env Setup Guide (one by one)

Fill these into `.env` locally, and the SAME values into **Railway → digimart service → Variables** (no quotes in Railway!). Never commit `.env` — it is git-ignored.

Generate random secrets in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 1. DATABASE_URL  — your NEW Railway Postgres
Do the database move FIRST (see RAILWAY_POSTGRES_MIGRATION.md), then paste the Railway URL here.
```dotenv
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/railway?sslmode=require
```
(Local .env only — on Railway use the variable reference `${{Postgres.DATABASE_URL}}` instead of a pasted URL.)

## 2. JWT_SECRET — signs login sessions
Generate one (command above) and paste:
```dotenv
JWT_SECRET=<64+ random hex characters>
```
⚠️ Rotate from the old one — the old value was exposed in chat.

## 3. NODE_ENV + APP_URL
```dotenv
NODE_ENV=development        # locally. On Railway set NODE_ENV=production (a variable)
APP_URL=http://localhost:3000   # locally. Railway: https://digimart-production-b330.up.railway.app
```
APP_URL is used for provider callback URLs and sitemap — always keep it exact (no trailing slash).

## 4. Moolre payments — from the Moolre merchant dashboard
Log in at **merchant.moolre.com** (account `digimartgh` / 10913506072267) → API / Integration section:

```dotenv
MOOLRE_BASE_URL=https://api.moolre.com
MOOLRE_API_USER=digimartgh
MOOLRE_API_PUBKEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9....   # the PUBLIC key (NOT the private one!)
MOOLRE_API_PRIVKEY=<private key>        # for TRANSFERS/payouts only (X-API-KEY)
MOOLRE_ACCOUNT_NUMBER=10913506072267
```

**MOOLRE_WEBHOOK_TOKEN** — generate a random hex string. Then in the Moolre dashboard set the
callback/webhook URL to EXACTLY:
```
https://digimart-production-b330.up.railway.app/api/webhooks/moolre?token=<that same value>
```
```dotenv
MOOLRE_WEBHOOK_TOKEN=<random hex>
```

**SMS (optional but recommended):** Moolre dashboard → SMS section → copy the VAS key:
```dotenv
MOOLRE_SMS_VASKEY=<from dashboard>
MOOLRE_SMS_SENDER=DigiMart          # must be a registered/approved Sender ID
```

**Transfer channels (for automatic payouts):** MTN is built in (channel 1). Ask Moolre for
Telecel / AirtelTigo transfer channel codes and set them when provided:
```dotenv
# MOOLRE_TRF_TELECEL=
# MOOLRE_TRF_AT=
```

> ⚠️ CURRENT STATUS: API authentication works (status 1 ✅) but Moolre returns **TP14 —
> "complete the verification process sent to you via SMS"**. Find that SMS on the phone
> number registered to the Moolre account and complete it (link/OTP, maybe in the portal).
> Until then no real MoMo prompt is sent to buyers. Complete it before taking customer orders.

## 5. BundleShopGH — data bundles
```dotenv
BUNDLESHOPGH_BASE_URL=https://backend.mycledanet.com
BUNDLESHOPGH_API_KEY=<from BundleShopGH>
BUNDLESHOPGH_WEBHOOK_TOKEN=<random hex — also in their callback URL>
```
Their callback URL must be:
`https://digimart-production-b330.up.railway.app/api/webhooks/bundleshopgh?token=<same value>`

## 6. Muviin — airtime / result checkers / subscriptions
From **vendor.muviin.co** → API/settings:
```dotenv
MUVIIN_API_KEY=<from vendor portal>
```

## 6b. Refer2Bundle — additional data-bundle provider (optional)
From your Refer2Bundle account (API key page):
```dotenv
REFER2BUNDLE_BASE_URL=https://refer2bundle.com/api/v1
REFER2BUNDLE_API_KEY=<from Refer2Bundle>
```
Data bundle products can then be listed under the "Refer2Bundle (data bundles)" source
in Admin → Products → Add product. Orders poll for status every 5 minutes via the cron job.

## 7. Cloudinary — product image uploads (optional)
console.cloudinary.com → Dashboard → Account Details:
```dotenv
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

## 8. Google sign-in (optional)
console.cloud.google.com → APIs & Services → Credentials → **Create Credentials → OAuth client ID**
(Web application). Under "Authorized redirect URIs" add:
```
https://digimart-production-b330.up.railway.app/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```
```dotenv
GOOGLE_CLIENT_ID=<client id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>
```

## 9. Web push notifications (optional)
Run once, copy both keys:
```powershell
npx web-push generate-vapid-keys
```
```dotenv
VAPID_PUBLIC_KEY=<Public Key>
VAPID_PRIVATE_KEY=<Private Key>
VAPID_SUBJECT=mailto:you@example.com
```

## 10. Platform economics + operations
```dotenv
PAYMENT_FEE_PCT=1.95        # % the BUYER pays for MoMo processing — match Moolre's real tariff
PAYMENT_FEE_FLAT=0          # optional flat pesewas added to the fee
SELLER_COMMISSION_PCT=10    # platform cut of seller physical sales
JOBS_TOKEN=<random hex>     # protects the Muviin polling job (Railway cron uses it)
ADMIN_RECOVERY_KEY=<random hex>  # admin create/promote panel on the sign-in page
```

## 11. One-time database move helpers (delete after moving)
```dotenv
# DB_MOVE_FROM=postgresql://...neon...   # optional, defaults to DATABASE_URL
# DB_MOVE_TO=postgresql://...railway...
```

---

# Railway Variables checklist (same values, NO quotes)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=...
NODE_ENV=production
APP_URL=https://digimart-production-b330.up.railway.app
MOOLRE_BASE_URL=https://api.moolre.com
MOOLRE_API_USER=digimartgh
MOOLRE_API_PUBKEY=...
MOOLRE_API_PRIVKEY=...
MOOLRE_ACCOUNT_NUMBER=10913506072267
MOOLRE_WEBHOOK_TOKEN=...
MOOLRE_SMS_VASKEY=...
MOOLRE_SMS_SENDER=DigiMart
BUNDLESHOPGH_BASE_URL=https://backend.mycledanet.com
BUNDLESHOPGH_API_KEY=...
BUNDLESHOPGH_WEBHOOK_TOKEN=...
MUVIIN_API_KEY=...
REFER2BUNDLE_BASE_URL=https://refer2bundle.com/api/v1
REFER2BUNDLE_API_KEY=...
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
PAYMENT_FEE_PCT=1.95
SELLER_COMMISSION_PCT=10
JOBS_TOKEN=...
ADMIN_RECOVERY_KEY=...
```
Then **Redeploy**, and verify `https://digimart-production-b330.up.railway.app/api/health/database`.
