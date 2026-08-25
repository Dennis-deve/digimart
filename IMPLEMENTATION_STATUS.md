# DigiMart implementation status

## Implemented

- Next.js/TypeScript mobile-first marketplace UI and PWA manifest
- PostgreSQL/Prisma connection and safe additive SQL migrations
- Authentication, password hashing, JWT-backed HTTP-only sessions, logout, role checks, and protected routes
- Customer catalog/product/checkout APIs
- Coupon database, admin coupon creation, server-side validation, and order discount storage
- Persistent orders, item records, receipts, customer order history, and tracking
- Moolre collection/status adapter and protected callback flow (requires correct live Moolre API activation)
- BundleShopGH data fulfilment routing/callback structure
- Muviin airtime routing, admin recheck, and scheduled-job endpoint
- Wallet, ledger, refund-to-wallet handling, and customer wallet page/API
- Reseller application, approval, markup, store pricing, payout request and payout completion APIs
- Seller application/approval APIs
- Customer addresses, delivery zones, delivery quoting, automatic delivery creation after verified payment, rider delivery state APIs, and delivery tracking
- Support tickets, support queue API, and notification center
- Cloudinary server-side image upload API
- Admin product CRUD, coupon creation, delivery zone, delivery creation, refund, reseller, seller, payout, and announcement APIs
- Audit-log table and refund audit event
- Deployment runbook for Railway and Render

## Still requiring code expansion / test completion

- Finished visual checkout UX for quantity controls, address selection, zone selection, pickup and scheduled service selection
- Seller/reseller/rider dashboard data wiring and analytics screens
- Review/rating system
- Referral/loyalty data model and UI
- Full support conversations, attachments, staff assignment and escalation UI
- Full admin analytics, audit viewer and settings interfaces
- Production grade queue/Redis rate limiting, error monitoring and automated test suite

## Requires external configuration or verification

- Moolre API access correction: previous live collection test returned `AIN01 Authentication Error`
- Public HTTPS deployment domain and provider callback registration
- BundleShopGH live callback confirmation
- Muviin live provider tests
- Cloudinary live upload test
- SMS/WhatsApp/push/email provider configuration
- Deployment monitoring, backups and device/network tests
