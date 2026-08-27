# Refer2Bundle — integration plan (ON HOLD until owner clarification)

Status: **INTEGRATED (26 Aug 2026)** — live as a third data-bundle provider.

- New ProductSource `REFER2BUNDLE` (DB enum + Prisma + admin form "Refer2Bundle (data bundles)")
- Adapter: `src/lib/providers.ts` (order / order-status / balance, X-API-KEY auth)
- Fulfilment: auto on verified payment (network map MTN→MTN, AirtelTigo→AT, Telecel→TELECEL — **verify TELECEL code with the owner**)
- Status polling: `POST /api/jobs/recheck-refer2bundle` (JOBS_TOKEN, add to cron)
- Env: `REFER2BUNDLE_BASE_URL`, `REFER2BUNDLE_API_KEY`
- **AFA packages (integrated)**: category "AFA Registration" under the Refer2Bundle source. Buyer fills
  full name + Ghana Card number + location at checkout (validated); after verified payment the app calls
  `POST /afa/register` (GHS 11 fee from the Refer2Bundle wallet — price your product above that), stores
  the AFA reference on the order item, and the polling job tracks `/afa/status` until confirmed, then
  notifies + SMSes the buyer with the reference.

Original plan kept below for reference.
This file captures everything needed so integration is fast when approved.

## API summary (from https://refer2bundle.com/api/v1/docs/index.php)
- Base URL: `https://refer2bundle.com/api/v1`
- Auth: `X-API-KEY: <key>` header (or `Authorization: Bearer <key>`) — never in URL params
- Offers: **data bundles** (MTN / AT seen; presumably Telecel too), **AFA registrations**, bulk orders

### Key endpoints
| Endpoint | Method | Body / Query | Notes |
|---|---|---|---|
| `/balance` | GET | — | `{status:'success',data:{balance,currency,user}}` |
| `/bundles?network=MTN` | GET | — | catalog list — could power product sync |
| `/order` | POST | `{network:'MTN', data_plan:'1GB', beneficiary:'0244...'}` | returns `data.reference` |
| `/bulk-order` | POST | `{orders:[...max 50]}` | |
| `/order-status?reference=ABC` | GET | — | status of an order |
| `/orders?limit&offset&status` | GET | — | history |
| `/afa/register` | POST | `{full_name, phone, id_card_number, location, idempotency_key}` | GHS 11 fee from wallet |
| `/afa/status/{ref}` + `/afa/registrations` | GET | — | AFA tracking |

Rate limits: 50/hour for orders, 200/hour for reads.
Error shape: `{status:'error', data:{message, code, details}}`.

## Proposed DigiMart integration (when approved)
Follows the existing adapter pattern (`src/lib/providers.ts`) — the rest of the app stays untouched:

1. **Adapter** `fulfillRefer2Bundle({network, dataPlan, beneficiary})` → POST /order; store `reference`
   as the OrderItem externalRef.
2. **Status polling** — no webhook documented → poll `/order-status` in the Muviin-style cron job.
3. **Product source decision** (needs owner clarification):
   - Option A: replace BundleShopGH for data bundles (env-driven switch: `DATA_PROVIDER=bundleshopgh|refer2bundle`)
   - Option B: use per-network routing (e.g. Refer2Bundle for AT/Telecel, BundleShopGH for MTN)
   - Option C: add as a third source `REFER2BUNDLE` in the ProductSource enum + admin form
4. **Env** (already anticipated, not active):
   ```dotenv
   REFER2BUNDLE_BASE_URL=https://refer2bundle.com/api/v1
   REFER2BUNDLE_API_KEY=<from provider>
   REFER2BUNDLE_WEBHOOK_TOKEN=<if they add webhooks>
   ```
5. **AFA registrations**: possible future customer product (like result checkers) — needs product/UI design.

## Questions to ask the project owner
1. Should Refer2Bundle REPLACE BundleShopGH for data, or run alongside it?
2. Which networks on Refer2Bundle (MTN/Telecel/AT?) and their bundle list + your wholesale prices?
3. Do they have webhooks/callbacks, or is polling the only way?
4. Data plan naming: exact `data_plan` values ("1GB", "500MB", …)?
5. Is the AFA registration product something we should expose to customers?
