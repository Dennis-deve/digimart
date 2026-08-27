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
