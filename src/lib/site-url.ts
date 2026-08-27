// Single source of truth for the public site URL — tolerates APP_URL with or
// without a protocol (a missing https:// must never crash a build or break callbacks).
export const siteUrl = (): string => {
  const raw = process.env.APP_URL ?? 'https://digimart-production-b330.up.railway.app';
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
};
