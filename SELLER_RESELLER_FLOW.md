# Becoming a Seller or Reseller on DigiMart — the full flow

## A. RESELLER — own a branded storefront with your own prices

```
1. SIGN UP / SIGN IN            Anyone creates a normal account at /sign-up (role: CUSTOMER)
        |
2. APPLY                        /reseller  →  "Reseller application"
                                Enter: store name, store URL slug, MoMo number
        |
3. PAY REGISTRATION FEE         GH₵ fee via Moolre MoMo prompt at application time.
                                The Moolre WEBHOOK (server-verified) flips feePaid = true.
                                No approval until the fee is verified — a prompt on the
                                phone alone is never enough.
        |
4. ADMIN APPROVAL              /admin → Resellers → Approve
                                (server blocks approval while feePaid = false)
                                → User role becomes RESELLER instantly
        |
5. OWN YOUR STORE              /reseller dashboard:
                                • Default markup % (e.g. +10% on everything)
                                • Per-product markup overrides
                                • Storefront tagline + brand color  →  /store/your-slug
                                • Share your link anywhere — it's public
        |
6. SELL                        Buyer opens /store/your-slug → sees YOUR prices
                                (base price + your markup) → Buy → checkout with
                                resellerSlug → pays DigiMart via Moolre
        |
7. EARN                        When the order completes (providers confirm), your
                                markup (unitPrice − basePrice) is credited to your
                                earnings balance automatically — once per order.
        |
8. GET PAID                    Set your payout MoMo account → "Request payout"
                                → Admin pays you: one tap "Send via Moolre" (real
                                MoMo transfer to your phone) or manual mark-paid.
                                SMS confirmation when money lands.
```

## B. SELLER — fulfill physical products, earn per sale

```
1. SIGN UP / SIGN IN            Normal customer account
        |
2. APPLY                        /seller → "Apply to sell" (store name + slug)
                                (No fee — admin review only)
        |
3. ADMIN APPROVAL              /admin → Sellers → Approve
                                → User role becomes SELLER
        |
4. GET PRODUCTS ASSIGNED       ADMIN lists products in the catalog
                                (/admin/products/new) and assigns them to your
                                store in the product form — DigiMart is a curated
                                marketplace; sellers don't upload products directly.
        |
5. FULFILL ORDERS              /seller dashboard → Order queue:
                                every order containing your products, live status,
                                delivery info
        |
6. EARN                        When an order completes, you earn
                                gross − platform commission (SELLER_COMMISSION_PCT,
                                default 10%). Credited automatically, once.
        |
7. GET PAID                     Set payout MoMo account → Request payout (min GH₵5)
                                → Admin sends via Moolre transfer or marks paid.
```

## Roles ladder (all granted by admin, never self-serve)
`CUSTOMER → RESELLER or SELLER or RIDER → (ADMIN by recovery key / SQL only)`

## Where everything lives
| Step | Page | API |
|---|---|---|
| Apply | /reseller, /seller | POST /api/resellers/apply, /api/sellers/apply |
| Fee verified | — (webhook) | POST /api/webhooks/moolre |
| Approve | /admin | POST /api/admin/resellers/:id/approve, /api/admin/sellers/:id/approve |
| Storefront | /store/:slug (public) | GET /api/store/:slug |
| Markups | /reseller | PATCH /api/resellers/me/markup(+/[productId]) |
| Earnings | automatic | src/lib/settle.ts |
| Payouts | /reseller, /seller, /admin/payouts | POST /api/resellers/me/payouts, /api/sellers/me/payouts, /api/admin/payouts/:id/send |
