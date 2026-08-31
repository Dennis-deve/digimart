import { prisma } from '@/lib/db';
import { providerFetch } from '@/lib/provider-http';
import { round2 } from '@/lib/fees';
import { mapR2BBundles, mapBSGHBundles, categorizeMuviinItem, isExternalProduct, type R2BBundle, type MappedCatalogProduct } from '@/lib/product-rules';
import { BUNDLESHOPGH_BUNDLES, BUNDLESHOPGH_AFA } from '@/lib/bundleshopgh-catalog';

// ============================================================
// ONE-CLICK PROVIDER CATALOG SYNC
// Pulls the owner's real inventory from provider catalog APIs into DigiMart,
// applying the strict provider rules from day one:
//   BundleShopGH -> data bundles ONLY (no listing API exists today)
//   Muviin       -> checkers/streaming/tickets — DATA BUNDLES ALWAYS EXCLUDED
//   Refer2Bundle -> data bundles (+ AFA products stay manual)
// Imported products hide the provider cost; the store price adds the owner's
// margin (CATALOG_MARGIN_PCT, default 15). Sellers/resellers then add their own
// markups on top — that layer already exists.
// ============================================================

export type SyncResult = { provider: string; ok: boolean; fetched: number; imported: number; updated: number; skipped: number; message: string };
export const defaultMarginPct = () => { const v = Number(process.env.CATALOG_MARGIN_PCT ?? '0'); return Number.isFinite(v) && v >= 0 && v <= 300 ? v : 0; };
const bsghStoreUrl = () => process.env.BUNDLESHOP_STORE_URL ?? 'https://bundleshopgh.com/store/joedai';
const muviinStoreUrl = () => process.env.MUVIIN_STORE_URL ?? "https://vendor.muviin.co/#/merchant/3245-ADDAI'SBUNDLE";
const r2bStoreUrl = () => process.env.REFER2BUNDLE_STORE_URL ?? null;

async function upsertProduct(source: 'REFER2BUNDLE' | 'MUVIIN' | 'BUNDLESHOPGH', m: MappedCatalogProduct, category: string, hidden: boolean, externalUrl: string | null = null): Promise<'imported' | 'updated'> {
  const existing = await prisma.product.findUnique({ where: { source_sourceProductId: { source, sourceProductId: m.sourceProductId } } });
  await prisma.product.upsert({
    where: { source_sourceProductId: { source, sourceProductId: m.sourceProductId } },
    create: { id: m.sourceProductId, source, sourceProductId: m.sourceProductId, name: m.name, network: m.network ?? null, category, basePrice: m.basePrice, providerCost: m.cost, externalCheckoutUrl: externalUrl, images: [], inStock: true, isExcluded: hidden, approvalStatus: 'APPROVED', updatedAt: new Date() },
    update: { name: m.name, network: m.network ?? null, basePrice: m.basePrice, providerCost: m.cost, externalCheckoutUrl: externalUrl, inStock: true, isExcluded: hidden, approvalStatus: 'APPROVED', updatedAt: new Date() },
  });
  return existing ? 'updated' : 'imported';
}

// ---------- Refer2Bundle (public /bundles — verified live) ----------
async function syncRefer2Bundle(marginPct: number, hidden: boolean): Promise<SyncResult> {
  const base = process.env.REFER2BUNDLE_BASE_URL ?? 'https://refer2bundle.com/api/v1';
  try {
    const response = await providerFetch(`${base}/bundles`, { headers: process.env.REFER2BUNDLE_API_KEY ? { 'X-API-KEY': process.env.REFER2BUNDLE_API_KEY } : {} });
    if (!response.ok) return { provider: 'Refer2Bundle', ok: false, fetched: 0, imported: 0, updated: 0, skipped: 0, message: `Catalog request failed (HTTP ${response.status}).` };
    const body = await response.json() as { status?: string; data?: { bundles?: R2BBundle[] } };
    const bundles = Array.isArray(body.data?.bundles) ? body.data!.bundles! : [];
    const mapped = mapR2BBundles(bundles, marginPct);
    let imported = 0, updated = 0;
    for (const m of mapped) { (await upsertProduct('REFER2BUNDLE', m, 'Data Bundles', hidden, r2bStoreUrl())) === 'imported' ? imported++ : updated++; } // external only when REFER2BUNDLE_STORE_URL is set
    return { provider: 'Refer2Bundle', ok: true, fetched: bundles.length, imported, updated, skipped: bundles.length - mapped.length, message: `${imported} new + ${updated} refreshed data bundles (MTN, MTN Express, AirtelTigo, Telecel).${hidden ? ' Imported hidden — press Sync again after deploying the latest code to publish them.' : ''}` };
  } catch (e) {
    return { provider: 'Refer2Bundle', ok: false, fetched: 0, imported: 0, updated: 0, skipped: 0, message: e instanceof Error ? e.message : 'Sync failed.' };
  }
}

// ---------- Muviin (needs the CURRENT API key from vendor.muviin.co) ----------
async function syncMuviin(marginPct: number, hidden: boolean): Promise<SyncResult> {
  const key = process.env.MUVIIN_API_KEY;
  if (!key) return { provider: 'Muviin', ok: false, fetched: 0, imported: 0, updated: 0, skipped: 0, message: 'MUVIIN_API_KEY not set.' };
  const candidates = [{ func: 'GetProducts' }, { func: 'GetBundles', prod: 'bundles' }, { func: 'GetAllProducts' }];
  let items: Record<string, unknown>[] = [];
  let authFailed = false;
  for (const body of candidates) {
    try {
      const response = await providerFetch('https://core.muviin.co/src/api/v1/', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => null) as { status?: number | string; error?: { message?: string }; data?: unknown } | null;
      if (json && Number(json.status) === 0 && /auth/i.test(String(json.error?.message ?? ''))) { authFailed = true; continue; }
      const data = json?.data;
      const list = Array.isArray(data) ? data : Array.isArray((data as { products?: unknown[] })?.products) ? (data as { products: unknown[] }).products : Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items : [];
      if (list.length) { items = list as Record<string, unknown>[]; break; }
    } catch { /* try next */ }
  }
  if (authFailed && !items.length) return { provider: 'Muviin', ok: false, fetched: 0, imported: 0, updated: 0, skipped: 0, message: 'Muviin rejected this API key — copy the CURRENT key from vendor.muviin.co into MUVIIN_API_KEY, then Sync again.' };
  if (!items.length) return { provider: 'Muviin', ok: false, fetched: 0, imported: 0, updated: 0, skipped: 0, message: 'No catalog listing available from Muviin yet — ask the owner for their product-list function; checkers/streaming can be added manually meanwhile.' };
  let imported = 0, updated = 0, skipped = 0;
  for (const it of items.slice(0, 60)) {
    const name = String(it.name ?? it.product_name ?? it.title ?? '').trim();
    const price = Number(it.price ?? it.amount ?? it.cost);
    const code = String(it.id ?? it.code ?? it.slug ?? name).trim();
    if (!name || !Number.isFinite(price) || price <= 0 || !code) { skipped++; continue; }
    const category = categorizeMuviinItem(name);
    if (!category) { skipped++; continue; }
    const id = `mu-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
    const result = await upsertProduct('MUVIIN', { sourceProductId: id, name, basePrice: round2(price * (1 + marginPct / 100)), cost: round2(price) }, category, hidden, muviinStoreUrl());
    result === 'imported' ? imported++ : updated++;
  }
  return { provider: 'Muviin', ok: true, fetched: items.length, imported, updated, skipped, message: `${imported} new + ${updated} refreshed (Muviin data bundles & airtime skipped by rule).` };
}

// ---------- BundleShopGH (curated price list — no listing API exists) ----------
async function syncBundleShopGH(marginPct: number, hidden: boolean): Promise<SyncResult> {
  const mapped = mapBSGHBundles(BUNDLESHOPGH_BUNDLES, marginPct);
  let imported = 0, updated = 0;
  for (const m of mapped) { (await upsertProduct('BUNDLESHOPGH', m, 'Data Bundles', hidden, bsghStoreUrl())) === 'imported' ? imported++ : updated++; }
  // AFA (No ID) via BundleShopGH — keep the existing product id, ensure it exists at the curated price
  const afaExisting = await prisma.product.findUnique({ where: { id: 'afa-registration-no-id' } });
  await prisma.product.upsert({
    where: { id: 'afa-registration-no-id' },
    create: { id: 'afa-registration-no-id', source: 'BUNDLESHOPGH', sourceProductId: 'afa-registration-no-id', name: 'AFA Registration (No ID)', category: 'AFA Registration (No ID)', basePrice: round2(BUNDLESHOPGH_AFA.price * (1 + marginPct / 100)), providerCost: BUNDLESHOPGH_AFA.price, images: [], inStock: true, isExcluded: hidden, approvalStatus: 'APPROVED', updatedAt: new Date() },
    update: { inStock: true, isExcluded: hidden, approvalStatus: 'APPROVED', updatedAt: new Date() },
  });
  if (afaExisting) updated++; else imported++;
  return { provider: 'BundleShopGH', ok: true, fetched: BUNDLESHOPGH_BUNDLES.length + 1, imported, updated, skipped: 0, message: `${imported} new + ${updated} refreshed from the curated price list (bundleshopgh.com/store/joedai): MTN, Telecel, AirtelTigo + BigTime tiers + AFA (No ID).` };
}

export async function runCatalogSync(marginPct: number, hidden = false): Promise<{ marginPct: number; providers: SyncResult[] }> {
  const [r2b, muv, bsg] = await Promise.all([syncRefer2Bundle(marginPct, hidden), syncMuviin(marginPct, hidden), syncBundleShopGH(marginPct, hidden)]);
  return { marginPct, providers: [r2b, muv, bsg] };
}
