// Moolre per-transaction charges are passed to the BUYER (not absorbed by the platform).
// Configurable via env: PAYMENT_FEE_PCT (default 1.95) and PAYMENT_FEE_FLAT pesewas (default 0).
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const paymentFeePct = () => { const v = Number(process.env.PAYMENT_FEE_PCT ?? '1.95'); return Number.isFinite(v) && v >= 0 ? v : 0; };
export const paymentFeeFlat = () => { const v = Number(process.env.PAYMENT_FEE_FLAT ?? '0'); return Number.isFinite(v) && v >= 0 ? v : 0; };
/** Fee the buyer pays on top of (subtotal - discount + deliveryFee). */
export const computePaymentFee = (amountAfterDiscountAndDelivery: number) =>
  round2(amountAfterDiscountAndDelivery * paymentFeePct() / 100 + paymentFeeFlat());
export const feeLabel = () => `MoMo processing fee (${paymentFeePct()}%)`;
/** Share of the delivery fee credited to the rider (percent). Default 100. */
export const riderFeePct = () => { const v = Number(process.env.RIDER_FEE_PCT ?? '100'); return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 100; };
/** Platform commission on a seller's product sold from THEIR OWN store link (default 0% — seller keeps all). */
export const sellerDirectCommissionPct = () => { const v = Number(process.env.SELLER_DIRECT_COMMISSION_PCT ?? '0'); return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 0; };
/** Platform commission on a seller's product sold via the MAIN marketplace (they opted in). Default 10%. */
export const sellerPlatformCommissionPct = () => { const v = Number(process.env.SELLER_COMMISSION_PCT ?? '10'); return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 10; };
/** Affiliate earn for a seller/reseller when ANY other product sells through their store link. Default 2%. */
export const storeAffiliatePct = () => { const v = Number(process.env.STORE_AFFILIATE_PCT ?? '2'); return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 2; };
/** One-time registration fee a seller pays to open their store (default GH₵30). */
export const sellerRegistrationFee = () => { const v = Number(process.env.SELLER_REGISTRATION_FEE ?? '30'); return Number.isFinite(v) && v >= 0 ? v : 30; };
