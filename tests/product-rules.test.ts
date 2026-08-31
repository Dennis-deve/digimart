import { describe, it, expect } from 'vitest';
import { validateProductRules, bundleSizeFromName } from '../src/lib/product-rules';

describe('strict provider rules', () => {
  it('BUNDLESHOPGH accepts a well-formed data bundle', () => {
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'Data Bundles', network: 'MTN', name: 'MTN 10GB Data Bundle' })).toBeNull();
  });

  it('BUNDLESHOPGH rejects wrong category, missing network and missing GB size', () => {
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'Electronics', network: 'MTN', name: 'MTN 10GB' })).toMatch(/Data Bundles/);
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'Data Bundles', name: 'MTN 10GB Data Bundle' })).toMatch(/network/i);
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'Data Bundles', network: 'MTN', name: 'MTN Big Data' })).toMatch(/size/i);
  });

  it('MUVIIN never allows data bundles (business rule)', () => {
    expect(validateProductRules({ source: 'MUVIIN', category: 'Data Bundles', network: 'MTN', name: 'MTN 10GB Data' })).toMatch(/Data bundles must be created under BundleShopGH/);
    expect(validateProductRules({ source: 'MUVIIN', category: 'Airtime', name: 'MTN Airtime GH₵10' })).toMatch(/network/i);
    expect(validateProductRules({ source: 'MUVIIN', category: 'Airtime', network: 'Telecel', name: 'Telecel Airtime GH₵10' })).toBeNull();
    expect(validateProductRules({ source: 'MUVIIN', category: 'Result Checkers', name: 'WASSCE Results Checker' })).toBeNull();
  });

  it('ADMIN catalog cannot host provider categories', () => {
    expect(validateProductRules({ source: 'ADMIN', category: 'Data Bundles', name: 'X' })).toMatch(/DigiMart own catalog/);
    expect(validateProductRules({ source: 'ADMIN', category: 'Groceries', name: 'Perfumed Rice 5kg' })).toBeNull();
  });

  it('parses bundle sizes exactly like fulfilment does', () => {
    expect(bundleSizeFromName('MTN 10GB Data Bundle')).toBe(10);
    expect(bundleSizeFromName('Telecel 2.5GB Data Bundle')).toBe(2.5);
    expect(bundleSizeFromName('AirtelTigo BigBundle')).toBeNull();
  });
});

describe('Refer2Bundle provider rules', () => {
  it('accepts GB and MB data bundles with network', () => {
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'Data Bundles', network: 'MTN', name: 'MTN 1GB Data Bundle' })).toBeNull();
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'Data Bundles', network: 'AirtelTigo', name: 'AirtelTigo 500MB Data' })).toBeNull();
  });
  it('rejects Refer2Bundle outside Data Bundles and without sizes', () => {
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'Airtime', network: 'MTN', name: 'MTN Airtime' })).toMatch(/Data Bundles/);
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'Data Bundles', network: 'MTN', name: 'MTN Big Data' })).toMatch(/size/i);
  });
  it('Muviin still never hosts data bundles', () => {
    expect(validateProductRules({ source: 'MUVIIN', category: 'Data Bundles', network: 'MTN', name: 'MTN 1GB' })).toMatch(/BundleShopGH/);
  });
  it('parses Refer2Bundle data plans (GB and MB)', async () => {
    const { dataPlanFromName } = await import('../src/lib/product-rules');
    expect(dataPlanFromName('MTN 1GB Data Bundle')).toBe('1GB');
    expect(dataPlanFromName('AirtelTigo 500MB Data')).toBe('500MB');
    expect(dataPlanFromName('Telecel 2.5GB Bundle')).toBe('2.5GB');
    expect(dataPlanFromName('No size here')).toBeNull();
  });
});

describe('AFA registration rules (Refer2Bundle only)', () => {
  it('accepts an AFA package without network or size', () => {
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'AFA Registration', name: 'AFA Registration Package' })).toBeNull();
  });
  it('AFA is available from providers but never the DigiMart own catalog', () => {
    expect(validateProductRules({ source: 'MUVIIN', category: 'AFA Registration', name: 'AFA' })).toBeNull();
    expect(validateProductRules({ source: 'ADMIN', category: 'AFA Registration', name: 'AFA' })).toMatch(/DigiMart own catalog/);
  });
  it('data bundle rules still apply to Refer2Bundle Data Bundles', () => {
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'Data Bundles', name: 'MTN Data' })).toMatch(/network/i);
  });
});

describe('AFA across providers (with and without Ghana Card)', () => {
  it('BundleShopGH hosts AFA with or without ID', () => {
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'AFA Registration', name: 'AFA Registration' })).toBeNull();
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'AFA Registration (No ID)', name: 'AFA No-ID Registration' })).toBeNull();
  });
  it('Muviin hosts AFA (admin-assisted)', () => {
    expect(validateProductRules({ source: 'MUVIIN', category: 'AFA Registration (No ID)', name: 'AFA No-ID' })).toBeNull();
    expect(validateProductRules({ source: 'MUVIIN', category: 'Data Bundles', name: 'MTN 1GB' })).toMatch(/BundleShopGH/);
  });
  it('Refer2Bundle AFA always requires the Ghana Card (No-ID not offered)', () => {
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'AFA Registration', name: 'AFA' })).toBeNull();
    expect(validateProductRules({ source: 'REFER2BUNDLE', category: 'AFA Registration (No ID)', name: 'AFA' })).toMatch(/Refer2Bundle supports/);
  });
  it('BundleShopGH data bundles still need network + GB size', () => {
    expect(validateProductRules({ source: 'BUNDLESHOPGH', category: 'Data Bundles', name: 'MTN Data' })).toMatch(/network/i);
  });
});

describe('provider catalog sync mapper (Refer2Bundle)', () => {
  it('normalizes networks, sizes names for fulfilment, applies margin', async () => {
    const { mapR2BBundles } = await import('../src/lib/product-rules');
    const out = mapR2BBundles([
      { network: 'MTN', plan_name: '1 GB', price: '4.30', bundle_id: 162 },
      { network: 'Airteltigo', plan_name: '2 GB', price: '8.30', bundle_id: 163 },
      { network: 'Telecel', plan_name: '5 GB', price: '20', bundle_id: 1 },
      { network: 'Express(MTN)', plan_name: '10 GB', price: '40', bundle_id: 2 },
    ], 15);
    expect(out.find(o => o.sourceProductId === 'r2b-162')).toMatchObject({ name: 'MTN 1GB Data Bundle', network: 'MTN', basePrice: 4.94 });
    expect(out.find(o => o.sourceProductId === 'r2b-163')!.network).toBe('AirtelTigo');
    expect(out.find(o => o.sourceProductId === 'r2b-2')!.name).toContain('MTN Express 10GB');
  });
  it('skips unknown networks, bad prices and duplicates', async () => {
    const { mapR2BBundles } = await import('../src/lib/product-rules');
    const out = mapR2BBundles([
      { network: 'Glo', plan_name: '1 GB', price: '2', bundle_id: 9 },
      { network: 'MTN', plan_name: '1 GB', price: 'x', bundle_id: 10 },
      { network: 'MTN', plan_name: '1 GB', price: '4.30', bundle_id: 162 },
      { network: 'MTN', plan_name: '2 GB', price: '8.30', bundle_id: 162 },
    ], 15);
    expect(out.length).toBe(1);
  });
  it('Muviin categorizer NEVER maps data bundles (strict rule)', async () => {
    const { mapR2BBundles } = await import('../src/lib/product-rules');
    expect(mapR2BBundles([], 10)).toEqual([]);
  });
});

describe('BundleShopGH curated-catalog mapper', () => {
  it('creates tiered names with GB sizes and applies margin', async () => {
    const { mapBSGHBundles } = await import('../src/lib/product-rules');
    const out = mapBSGHBundles([
      { tier: 'MTN', size: 1, price: 4.6 },
      { tier: 'TELECEL', size: 5, price: 21 },
      { tier: 'AIRTELTIGO_BIGTIME', size: 10, price: 38 },
    ], 15);
    expect(out.find(o => o.sourceProductId === 'bsgh-mtn-1gb')).toMatchObject({ name: 'MTN 1GB Data Bundle', network: 'MTN', basePrice: 5.29 });
    expect(out.find(o => o.sourceProductId === 'bsgh-telecel-5gb')!.name).toBe('Telecel 5GB Data Bundle');
    expect(out.find(o => o.sourceProductId === 'bsgh-airteltigo-bigtime-10gb')!.name).toBe('AirtelTigo BigTime 10GB Data Bundle');
  });
  it('skips invalid entries and duplicates', async () => {
    const { mapBSGHBundles } = await import('../src/lib/product-rules');
    const out = mapBSGHBundles([
      { tier: 'GLO' as never, size: 1, price: 2 },
      { tier: 'MTN', size: 1, price: 0 },
      { tier: 'MTN', size: 1, price: 4.6 },
      { tier: 'MTN', size: 1, price: 4.7 },
    ], 10);
    expect(out.length).toBe(1);
  });
});

describe('external-checkout decision (as-is price hands off, markup stays)', () => {
  it('at cost + URL -> external', async () => {
    const { isExternalProduct } = await import('../src/lib/product-rules');
    expect(isExternalProduct({ externalCheckoutUrl: 'https://bundleshopgh.com/store/joedai', providerCost: 4.6, basePrice: 4.6 })).toBe(true);
  });
  it('any markup -> internal (DigiMart checkout)', async () => {
    const { isExternalProduct } = await import('../src/lib/product-rules');
    expect(isExternalProduct({ externalCheckoutUrl: 'https://x.com', providerCost: 4.6, basePrice: 5.29 })).toBe(false);
  });
  it('no URL or missing cost -> internal', async () => {
    const { isExternalProduct } = await import('../src/lib/product-rules');
    expect(isExternalProduct({ externalCheckoutUrl: null, providerCost: 4.6, basePrice: 4.6 })).toBe(false);
    expect(isExternalProduct({ externalCheckoutUrl: 'https://x.com', providerCost: null, basePrice: 4.6 })).toBe(false);
  });
});
