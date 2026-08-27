// Pure, testable catalog rules shared by the admin API and unit tests.
export const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'] as const;
export type Network = typeof NETWORKS[number];
export const DATA_BUNDLE_CATEGORIES = ['Data Bundles'];
export const AFA_CATEGORIES = ['AFA Registration', 'AFA Registration (No ID)'];
export const REFER2BUNDLE_CATEGORIES = ['Data Bundles', 'AFA Registration']; // Refer2Bundle's API requires the Ghana Card
export const afaNeedsId = (category: string) => category === 'AFA Registration';
export const MUVIIN_CATEGORIES = ['Airtime', 'Result Checkers', 'Streaming & Subscriptions', 'Bills & Utilities', 'AFA Registration', 'AFA Registration (No ID)', 'Other Digital'];
export const ADMIN_CATEGORIES = ['Electronics', 'Groceries', 'Fashion', 'Home & Essentials', 'Beauty & Personal Care', 'Services', 'Other'];
export const BUNDLESHOPGH_CATEGORIES = ['Data Bundles', 'AFA Registration', 'AFA Registration (No ID)'];
export type ProductSource = 'ADMIN' | 'BUNDLESHOPGH' | 'MUVIIN' | 'REFER2BUNDLE';

/** BundleShopGH & Refer2Bundle -> data bundles ONLY. Muviin -> no data bundles. Size parsed from name at fulfilment. */
export function validateProductRules(input: { source: ProductSource; category: string; network?: string; name: string }): string | null {
  const gbSize = /(\d+(?:\.\d+)?)\s*GB/i;
  const gbOrMb = /(\d+(?:\.\d+)?)\s*(GB|MB)/i;
  if (input.source === 'BUNDLESHOPGH') {
    if (AFA_CATEGORIES.includes(input.category)) return null; // AFA via BundleShopGH (with or without Ghana Card)
    if (!DATA_BUNDLE_CATEGORIES.includes(input.category)) return `BundleShopGH supports: ${BUNDLESHOPGH_CATEGORIES.join(', ')}.`;
    if (!input.network || !NETWORKS.includes(input.network as Network)) return 'Data bundles require a network: MTN, Telecel or AirtelTigo.';
    if (!gbSize.test(input.name)) return 'Data bundle names must include the size in GB, e.g. "MTN 10GB Data Bundle" (BundleShopGH fulfilment reads GB sizes).';
    return null;
  }
  if (input.source === 'REFER2BUNDLE') {
    if (!REFER2BUNDLE_CATEGORIES.includes(input.category)) return `Refer2Bundle supports: ${REFER2BUNDLE_CATEGORIES.join(', ')}.`;
    if (input.category === 'AFA Registration') return null; // form-based service — buyer details captured at checkout
    if (!input.network || !NETWORKS.includes(input.network as Network)) return 'Data bundles require a network: MTN, Telecel or AirtelTigo.';
    if (!gbOrMb.test(input.name)) return 'Refer2Bundle names must include the size, e.g. "MTN 1GB Data Bundle" or "AirtelTigo 500MB Data".';
    return null;
  }
  if (input.source === 'MUVIIN') {
    if (!MUVIIN_CATEGORIES.includes(input.category)) return `Muviin supports: ${MUVIIN_CATEGORIES.join(', ')}. Data bundles must be created under BundleShopGH.`;
    if (AFA_CATEGORIES.includes(input.category)) return null; // AFA via Muviin (admin-assisted)
    if (input.category === 'Airtime' && (!input.network || !NETWORKS.includes(input.network as Network))) return 'Airtime requires a network: MTN, Telecel or AirtelTigo.';
    return null;
  }
  if (!ADMIN_CATEGORIES.includes(input.category)) return `DigiMart own catalog supports: ${ADMIN_CATEGORIES.join(', ')}. Data bundles come from BundleShopGH; airtime/subscriptions from Muviin.`;
  return null;
}

/** Parses the data bundle size (GB) from a product name — same regex fulfilment uses. */
export function bundleSizeFromName(name: string): number | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*GB/i);
  return m ? Number(m[1]) : null;
}

/** Maps a DigiMart result-checker product to a Muviin checker_type code. */
export function checkerTypeFor(product: { name: string; sourceProductId: string | null }): string {
  const n = product.name.toUpperCase();
  if (n.includes('BECE')) return 'BECE';
  if (n.includes('WASSCE')) return 'WASSCE';
  return product.sourceProductId ?? product.name;
}

/** Parses a Refer2Bundle data_plan like "10GB" / "500MB" from a product name. */
export function dataPlanFromName(name: string): string | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  return m ? `${m[1]}${m[2].toUpperCase()}` : null;
}
