# How DigiMart Works — The Complete System

## 1. The pieces
| Piece | What it is |
|---|---|
| **Next.js app** | One codebase = customer storefront + all APIs + dashboards, deployed on Railway |
| **PostgreSQL** | The single source of truth (moving Neon → Railway Postgres). 25+ tables |
| **Moolre** | Mobile Money collections (public key), transfers/payouts (private key), SMS |
| **BundleShopGH** | Data-bundle provider #1 (webhook callbacks) |
| **Refer2Bundle** | Data-bundle provider #2 (status polling) |
| **Muviin** | Airtime, result checkers, subscriptions (status polling) |
| **Cloudinary** | Product images |
| **Google OAuth** | Optional sign-in |
| **Web Push (VAPID)** | Browser push notifications |

## 2. People & roles
`CUSTOMER` (default at signup) → `RESELLER` / `SELLER` / `RIDER` / `SUPPORT` → `ADMIN`.
Roles are granted by admin (or the sign-in page's recovery-key panel) — never self-serve.
Login issues a signed **JWT cookie** (7 days) that carries the role; middleware gates
`/admin /seller /reseller /rider /account /wallet /orders /notifications`.

## 3. Catalog (admin-curated)
All products are created by ADMIN with strict provider rules:
- **📶 BundleShopGH / 📡 Refer2Bundle → Data Bundles only** (network + size in the name)
- **📞 Muviin → Airtime, Result Checkers, Streaming, Bills** — never data bundles
- **🛍️ DigiMart (ADMIN) → physical products, groceries, services** — optionally assigned to an approved seller

## 4. Buying — the money path (the golden flow)
1. Customer adds to cart (physical) or taps **Buy now** (digital → checkout opens directly)
2. Physical items: choose **Delivery** (zone + address, live fee, free above threshold) or **Pickup**
3. Checkout computes: **subtotal − coupon discount + delivery fee + MoMo processing fee (paid by the BUYER, default 1.95%)**
4. Server re-validates everything, creates a **PENDING** order, calls **Moolre collection** (public key)
5. Customer approves the MoMo prompt on their phone
6. **Only the verified Moolre webhook** (`?token=` shared secret) flips the order to PROCESSING —
   the frontend is NEVER trusted as proof of payment
7. Fulfilment starts instantly, per item

## 5. Fulfilment — every item routed independently
| Item type | What happens |
|---|---|
| BundleShopGH data | Size parsed from name → `POST /order` → their webhook completes it |
| Refer2Bundle data | Plan (GB/MB) → `POST /order` → cron polls `/order-status` every 5 min |
| Muviin airtime | Instant send → cron polls `GetAirtimeStatus` |
| Muviin result checker | `BuyChecker` → cron polls → voucher saved to the order + SMS |
| Physical (ADMIN) | Delivery row created → rider accepts → status chain → DELIVERED |

When ALL items are FULFILLED the order becomes COMPLETED → settlement runs (once per order).

## 6. Settlement (automatic, exactly once)
- **Reseller** (if order came through a store): earns `unitPrice − basePrice` (their markup)
- **Seller** (assigned to the product): earns `gross − platform commission` (default 10%)
- Everyone else: DigiMart keeps the margin
- Buyers/sellers/resellers get in-app + push + SMS updates at every step

## 7. Payouts (getting money out)
Seller/reseller sets a **payout MoMo account** → requests payout (min GH₵5, one pending at a time)
→ Admin sees it in `/admin/payouts` → **"Send via Moolre"** (real MoMo transfer using the PRIVATE
key) or manual mark-paid → recipient gets an SMS.

## 8. Reseller stores (personalized)
Apply → pay registration fee (webhook-verified) → admin approves → role becomes RESELLER →
dashboard: default markup %, per-product markups, tagline + brand color, payout account →
public store at `/store/slug` shows their prices → buyers pay DigiMart, reseller earns the markup.

## 9. Everything else
- **Notifications**: in-app rows + web push + SMS (payment, delivery, order done, checker ready, support replies, refunds)
- **Support**: threaded tickets with replies (customer ↔ admin), statuses, closing
- **Reviews**: 1–5 stars, one per user per product, shown on product pages + SEO structured data
- **Admin center**: overview stats (live), orders (filter + item detail), products (create/edit/hide/delete/assign seller), coupons, payouts, refunds, support, announcements, sellers, resellers
- **Rider center**: available deliveries, accept, one-tap status chain
- **Legal**: /legal/terms · privacy · refunds
- **Cron jobs**: `/api/jobs/recheck-muviin` + `/api/jobs/recheck-refer2bundle` (JOBS_TOKEN)

## 10. Money summary
| Flow | Who pays | Who receives |
|---|---|---|
| Product + delivery | Buyer | DigiMart merchant account |
| MoMo processing fee (1.95%) | **Buyer** (added at checkout) | Moolre |
| Seller earnings | DigiMart (at payout) | Seller's MoMo |
| Reseller markup | DigiMart (at payout) | Reseller's MoMo |
| Platform commission (10%) | Deducted from seller earnings | DigiMart |

## 11. Security model (invariants)
1. Only webhooks prove payments — never the frontend
2. All provider secrets server-side only (never NEXT_PUBLIC_)
3. Every webhook/callback protected by a token; all admin APIs role-gated
4. Provider rules enforced in code (Muviin can never sell data, etc.)
5. Settlement is idempotent (status-transition triggered, once per order)
6. `.env` never in git; all keys rotatable; sessions are signed JWT cookies
