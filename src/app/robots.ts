import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? 'https://digimart-production-b330.up.railway.app';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/wallet', '/orders', '/notifications', '/seller', '/rider', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
