# The DigiMart Money Model — who earns what

## Sellers (own inventory, own store, own prices)
| Event | Who earns | Amount |
|---|---|---|
| Apply → admin approves | — | Store link is generated IMMEDIATELY on application; it goes live for customers when approved |
| Upload a product | — | Goes to PENDING — visible NOWHERE (not even their store) until admin approves |
| Sale from THEIR store link (`/store/their-slug`) | **Seller: 100%** | 0% platform commission (`SELLER_DIRECT_COMMISSION_PCT`, default 0) |
| Same product ALSO on main marketplace (they opt in) | Seller earns minus commission | `SELLER_COMMISSION_PCT`, default 10% |
| ANY other product bought through their store link (data, airtime, AFA…) | **Seller: affiliate cut** | `STORE_AFFILIATE_PCT`, default 2% of the item |
| Wallet | Seller funds from MoMo / withdraws | min GH₵5, admin pays via Moolre transfer or manual |

Sellers set and change their OWN prices — those prices exist ONLY in their store and (if opted in) their platform listing. They never touch other sellers' or the platform's prices.

## Resellers (no inventory — resell the platform catalog with markup)
| Event | Who earns | Amount |
|---|---|---|
| Apply → pay GH₵50 fee (Moolre-verified or admin marks received) → admin approves | — | Store link live at `/store/their-slug` |
| They set default markup % + per-product overrides | — | Shown as THEIR prices in THEIR store only |
| Sale from their store link | **Reseller: the markup** | `their price − base price` per item |
| Wallet | Reseller funds from MoMo / withdraws | same as sellers |

## Platform (you)
- Margin on platform catalog items (provider products sold at your set prices)
- 10% commission on seller items sold via the marketplace (0% from their own stores)
- 2%… nothing on affiliate — the affiliate cut comes out of the platform's margin, not the buyer's price
- Riders earn `RIDER_FEE_PCT` (default 100%) of each delivery fee

## The buyer always pays the same price in a given store — all cuts come out on the server at settlement (exactly once per order).
