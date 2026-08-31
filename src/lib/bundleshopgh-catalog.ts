// ============================================================
// CURATED BundleShopGH CATALOG — transcribed from the owner's storefront
// (bundleshopgh.com/store/joedai). BundleShopGH exposes no listing API
// (probed live), so this file is the maintained source of truth.
// To update prices: edit here (or ask for a refresh) and press
// ⟳ Sync provider catalogs in Admin → Products.
// "Unavailable" items on the storefront are intentionally omitted.
// AFA registration (GH₵12, no Ghana Card needed) is included.
// ============================================================

export type BSGHTier = 'MTN' | 'TELECEL' | 'AIRTELTIGO' | 'AIRTELTIGO_BIGTIME' | 'AIRTELTIGO_ISHARE';
export type BSGHBundle = { tier: BSGHTier; size: number; price: number };

export const BUNDLESHOPGH_BUNDLES: BSGHBundle[] = [
  // ---- MTN ----
  { tier: 'MTN', size: 1, price: 4.6 }, { tier: 'MTN', size: 2, price: 9.2 }, { tier: 'MTN', size: 3, price: 13.8 },
  { tier: 'MTN', size: 4, price: 17.8 }, { tier: 'MTN', size: 5, price: 22 }, { tier: 'MTN', size: 6, price: 26 },
  { tier: 'MTN', size: 8, price: 34.5 }, { tier: 'MTN', size: 10, price: 42 }, { tier: 'MTN', size: 15, price: 62 },
  { tier: 'MTN', size: 20, price: 83 }, { tier: 'MTN', size: 25, price: 101 }, { tier: 'MTN', size: 30, price: 122 },
  { tier: 'MTN', size: 40, price: 158 }, { tier: 'MTN', size: 50, price: 197 }, { tier: 'MTN', size: 100, price: 380 },
  { tier: 'MTN', size: 220, price: 398 },
  // (8GB @40 and 217GB @315 are listed Unavailable on the storefront — omitted)
  // ---- TELECEL ----
  { tier: 'TELECEL', size: 5, price: 21 }, { tier: 'TELECEL', size: 10, price: 40 }, { tier: 'TELECEL', size: 11, price: 47 },
  { tier: 'TELECEL', size: 15, price: 58.5 }, { tier: 'TELECEL', size: 16, price: 68.5 }, { tier: 'TELECEL', size: 20, price: 76.5 },
  { tier: 'TELECEL', size: 22, price: 83 }, { tier: 'TELECEL', size: 30, price: 111 }, { tier: 'TELECEL', size: 33, price: 128 },
  { tier: 'TELECEL', size: 40, price: 146 }, { tier: 'TELECEL', size: 44, price: 163 }, { tier: 'TELECEL', size: 50, price: 180 },
  { tier: 'TELECEL', size: 55, price: 198 }, { tier: 'TELECEL', size: 100, price: 355 },
  // ---- AIRTELTIGO (regular) ----
  { tier: 'AIRTELTIGO', size: 1, price: 4.5 }, { tier: 'AIRTELTIGO', size: 2, price: 8.7 }, { tier: 'AIRTELTIGO', size: 3, price: 13.5 },
  { tier: 'AIRTELTIGO', size: 4, price: 17 }, { tier: 'AIRTELTIGO', size: 5, price: 21 }, { tier: 'AIRTELTIGO', size: 6, price: 24 },
  { tier: 'AIRTELTIGO', size: 7, price: 28 }, { tier: 'AIRTELTIGO', size: 8, price: 32 }, { tier: 'AIRTELTIGO', size: 9, price: 36 },
  // ---- AIRTELTIGO BIGTIME ----
  { tier: 'AIRTELTIGO_BIGTIME', size: 10, price: 38 }, { tier: 'AIRTELTIGO_BIGTIME', size: 15, price: 46 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 20, price: 58 }, { tier: 'AIRTELTIGO_BIGTIME', size: 25, price: 63 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 30, price: 70 }, { tier: 'AIRTELTIGO_BIGTIME', size: 40, price: 85 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 50, price: 96 }, { tier: 'AIRTELTIGO_BIGTIME', size: 60, price: 111 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 70, price: 125 }, { tier: 'AIRTELTIGO_BIGTIME', size: 80, price: 138 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 100, price: 171 }, { tier: 'AIRTELTIGO_BIGTIME', size: 130, price: 228 },
  { tier: 'AIRTELTIGO_BIGTIME', size: 170, price: 278 }, { tier: 'AIRTELTIGO_BIGTIME', size: 200, price: 329 },
];

/** AFA via BundleShopGH — no Ghana Card needed, GH₵12 one-time. */
export const BUNDLESHOPGH_AFA = { price: 12 };
