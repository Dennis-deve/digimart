# DigiMart Platform Audit — findings & fixes (27 Aug 2026)

## Critical gaps found → FIXED in this build
| # | Finding | Fix |
|---|---|---|
| 1 | **No admin UI to approve sellers/resellers** — APIs existed but no page; applications could never be approved from the interface | New **/admin/partners** page: approve/reject resellers (with "Mark fee received" escape hatch for fees paid outside Moolre), approve sellers. Added to admin nav |
| 2 | **Zero timeouts on ALL 15 provider API calls** — a hung Moolre/Muviin/BundleShopGH/Refer2Bundle request could freeze checkout/webhooks until the platform killed it | New `src/lib/provider-http.ts` (AbortController, 15s default, `PROVIDER_TIMEOUT_MS` env, no-store). Every provider call routed through it |
| 3 | Homepage "featured reseller" was a **fake hardcoded store** | Removed. New `/api/stores` returns **only admin-approved** resellers; homepage renders real verified stores and hides the section when none exist |
| 4 | Search bar was decorative | **Real search**: debounced (350ms), server-side `/api/products?q=&category=` (name/category/network/description, multi-word AND), category filter chips, result counts, clear button |
| 5 | "Delivering to Accra, Ghana" hardcoded header text | Removed |
| 6 | Mobile UX: search hidden on phones, small touch targets, iOS zoom-on-focus | Full responsive layer: search full-width row on phones, 44px+ targets, 16px inputs (no iOS zoom), safe-area insets (iPhone notch), hover disabled on touch, optimized grids 2-col phones → 4-col desktop |

## Seller/reseller flow — verified end to end
```
RESELLER: /reseller apply → Moolre fee (webhook verifies) OR admin "Mark fee received"
          → /admin/partners Approve → role=RESELLER → markup store /store/slug → earnings → payout
SELLER:   /seller apply → /admin/partners Approve → role=SELLER → admin assigns products
          → order queue → earnings (gross − 10%) → payout (Moolre transfer or manual)
```
Every arrow now has working UI + API + server-side rules. (Previously step 2 had NO interface.)

## Provider contact hardening
- All calls: 15s timeout, no-store cache, normalized errors
- Failures leave items PENDING (never fake success); polling jobs + admin ✓done recover them
- Webhook + status-poll safety net share idempotent confirmation logic

## Remaining (external, not code)
1. Moolre TP14 account verification — blocks live payments
2. Moolre direct PIN-prompt flow vs SMS-code (asked; channel codes env-ready)
3. Refer2Bundle Telecel code + AFA success statuses (owner to confirm)
4. Secrets rotation before public launch
