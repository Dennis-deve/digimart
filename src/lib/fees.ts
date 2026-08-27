// Moolre per-transaction charges are passed to the BUYER (not absorbed by the platform).
// Configurable via env: PAYMENT_FEE_PCT (default 1.95) and PAYMENT_FEE_FLAT pesewas (default 0).
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const paymentFeePct = () => { const v = Number(process.env.PAYMENT_FEE_PCT ?? '1.95'); return Number.isFinite(v) && v >= 0 ? v : 0; };
export const paymentFeeFlat = () => { const v = Number(process.env.PAYMENT_FEE_FLAT ?? '0'); return Number.isFinite(v) && v >= 0 ? v : 0; };
/** Fee the buyer pays on top of (subtotal - discount + deliveryFee). */
export const computePaymentFee = (amountAfterDiscountAndDelivery: number) =>
  round2(amountAfterDiscountAndDelivery * paymentFeePct() / 100 + paymentFeeFlat());
export const feeLabel = () => `MoMo processing fee (${paymentFeePct()}%)`;
