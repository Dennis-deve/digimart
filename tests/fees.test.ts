import { describe, it, expect, beforeEach, afterAll } from 'vitest';

describe('computePaymentFee (buyer pays Moolre charge)', () => {
  const origPct = process.env.PAYMENT_FEE_PCT;
  const origFlat = process.env.PAYMENT_FEE_FLAT;
  beforeEach(() => { delete process.env.PAYMENT_FEE_PCT; delete process.env.PAYMENT_FEE_FLAT; });
  afterAll(() => {
    if (origPct) process.env.PAYMENT_FEE_PCT = origPct;
    if (origFlat) process.env.PAYMENT_FEE_FLAT = origFlat;
  });

  it('charges the default 1.95% with no flat component', async () => {
    const { computePaymentFee } = await import('../src/lib/fees');
    expect(computePaymentFee(115)).toBe(2.24); // verified live against the DB
  });

  it('applies a custom percentage and flat pesewas from env', async () => {
    process.env.PAYMENT_FEE_PCT = '2';
    process.env.PAYMENT_FEE_FLAT = '0.5';
    const { computePaymentFee } = await import('../src/lib/fees');
    expect(computePaymentFee(100)).toBe(2.5);
  });

  it('never returns fractional pesewas', async () => {
    const { computePaymentFee } = await import('../src/lib/fees');
    for (const amount of [0.01, 3.33, 43, 999.99, 12345.67]) {
      const fee = computePaymentFee(amount);
      expect(Math.round(fee * 100)).toBe(fee * 100);
    }
  });

  it('rejects invalid env values by falling back to safe defaults', async () => {
    process.env.PAYMENT_FEE_PCT = 'not-a-number';
    const { computePaymentFee, paymentFeePct } = await import('../src/lib/fees');
    expect(paymentFeePct()).toBe(0);
    expect(computePaymentFee(100)).toBe(0);
  });
});
