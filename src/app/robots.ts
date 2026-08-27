import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/wallet', '/orders', '/notifications', '/seller', '/rider', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
