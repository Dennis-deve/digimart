import { describe, it, expect } from 'vitest';
import { checkerTypeFor } from '../src/lib/product-rules';

describe('Muviin result-checker mapping', () => {
  it('maps product names to checker codes', () => {
    expect(checkerTypeFor({ name: 'WASSCE Results Checker', sourceProductId: 'x' })).toBe('WASSCE');
    expect(checkerTypeFor({ name: 'BECE Results Checker', sourceProductId: null })).toBe('BECE');
  });
  it('falls back to the provider product code', () => {
    expect(checkerTypeFor({ name: 'NovDec Checker', sourceProductId: 'NOVDEC' })).toBe('NOVDEC');
  });
});

describe('Moolre transfer channel map (private key endpoints)', () => {
  it('MTN is channel 1 by default; others require env', async () => {
    delete process.env.MOOLRE_TRF_TELECEL;
    delete process.env.MOOLRE_TRF_AT;
    const { transferChannelFor } = await import('../src/lib/moolre-transfer');
    expect(transferChannelFor('MTN')).toBe('1');
    expect(transferChannelFor('Telecel')).toBeUndefined();
    expect(transferChannelFor('AirtelTigo')).toBeUndefined();
  });
});
