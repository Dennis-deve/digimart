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

// ---------- Provider catalog sync mappers (pure — unit tested) ----------
export type R2BBundle = { network: string; plan_name: string; price: string; bundle_id: number };
export type MappedCatalogProduct = { sourceProductId: string; name: string; network?: string; basePrice: number; cost: number };
/** Refer2Bundle /bundles mapper: normalizes networks (Express(MTN) becomes an "MTN Express" tier),
 *  names include the size for fulfilment, owner margin applied. Unknown networks are skipped. */
export function mapR2BBundles(bundles: R2BBundle[], marginPct: number): MappedCatalogProduct[] {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const out: MappedCatalogProduct[] = [];
  for (const b of bundles) {
    const netRaw = String(b.network ?? '').trim();
    let network: string | null = null; let tier = '';
    if (netRaw === 'MTN') network = 'MTN';
    else if (netRaw === 'Airteltigo' || netRaw === 'AT') network = 'AirtelTigo';
    else if (netRaw === 'Telecel' || netRaw === 'Vodafone') network = 'Telecel';
    else if (/express.*mtn|mtn.*express/i.test(netRaw)) { network = 'MTN'; tier = 'Express '; }
    if (!network) continue;
    const plan = String(b.plan_name ?? '').replace(/\s+/g, '');
    if (!plan) continue;
    const cost = Number(b.price);
    if (!Number.isFinite(cost) || cost <= 0) continue;
    const id = `r2b-${b.bundle_id}`;
    if (out.some(o => o.sourceProductId === id)) continue;
    const basePrice = round2(cost * (1 + marginPct / 100));
    out.push({ sourceProductId: id, name: `${network} ${tier}${plan} Data Bundle`.replace('  ', ' ').trim(), network, basePrice, cost: round2(cost) });
  }
  return out;
}
const MUVIIN_DATA_LIKE = /(data\s*bundle|\d+\s*(gb|mb)\b)/i;
/** Muviin item categorizer — data bundles are NEVER sold from Muviin (strict rule). */
export function categorizeMuviinItem(name: string): string | null {
  const n = name.toLowerCase();
  if (MUVIIN_DATA_LIKE.test(name)) return null;
  if (/checker|wassce|bece|waec|result/.test(n)) return 'Result Checkers';
  if (/netflix|spotify|youtube|disney|stream|prime video|showmax/.test(n)) return 'Streaming & Subscriptions';
  if (/airtime|credit/.test(n)) return null;
  if (/ticket|event|concert/.test(n)) return 'Other Digital';
  return 'Other Digital';
}

// ---------- BundleShopGH curated-catalog mapper (pure — unit tested) ----------
export type BSGHTier = 'MTN' | 'TELECEL' | 'AIRTELTIGO' | 'AIRTELTIGO_BIGTIME' | 'AIRTELTIGO_ISHARE';
const BSGH_DISPLAY: Record<string, { label: string; network: string }> = {
  MTN: { label: 'MTN', network: 'MTN' },
  TELECEL: { label: 'Telecel', network: 'Telecel' },
  AIRTELTIGO: { label: 'AirtelTigo', network: 'AirtelTigo' },
  AIRTELTIGO_BIGTIME: { label: 'AirtelTigo BigTime', network: 'AirtelTigo' },
  AIRTELTIGO_ISHARE: { label: 'AirtelTigo iShare', network: 'AirtelTigo' },
};
/** Maps the curated BundleShopGH list to products. The tier lives in the NAME
 *  (fulfilment routes BigTime/iShare to their own BundleShopGH network codes). */
export function mapBSGHBundles(bundles: { tier: BSGHTier; size: number; price: number }[], marginPct: number): MappedCatalogProduct[] {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const out: MappedCatalogProduct[] = [];
  for (const b of bundles) {
    const d = BSGH_DISPLAY[b.tier];
    if (!d || !Number.isFinite(b.size) || b.size <= 0 || !Number.isFinite(b.price) || b.price <= 0) continue;
    const id = `bsgh-${b.tier.toLowerCase().replace(/[^a-z]+/g, '-')}-${b.size}gb`;
    if (out.some(o => o.sourceProductId === id)) continue;
    out.push({ sourceProductId: id, name: `${d.label} ${b.size}GB Data Bundle`, network: d.network, basePrice: round2(b.price * (1 + marginPct / 100)), cost: round2(b.price) });
  }
  return out;
}

// ---------- External-checkout decision (pure — unit tested) ----------
/** TRUE when a provider product sells at the provider's own price and should hand
 *  off to the provider's own payment page. Any markup (margin, seller/reseller)
 *  keeps the sale on DigiMart checkout. Store contexts are ALWAYS internal. */
type NumericLike = string | number | { toNumber(): number } | null | undefined;
const toNum = (v: NumericLike): number => (v !== null && typeof v === 'object' ? v.toNumber() : Number(v));
export function isExternalProduct(p: { externalCheckoutUrl?: string | null; providerCost?: NumericLike; basePrice: NumericLike }): boolean {
  if (!p.externalCheckoutUrl) return false;
  const cost = toNum(p.providerCost);
  const price = toNum(p.basePrice);
  if (!Number.isFinite(cost) || !Number.isFinite(price)) return false;
  return price <= cost + 0.001;
}
