import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/sign-in`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/sign-up`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/support`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/reseller`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/seller`, changeFrequency: 'monthly', priority: 0.6 },
  ];
  try {
    const products = await prisma.product.findMany({ where: { inStock: true, isExcluded: false }, select: { id: true, updatedAt: true } });
    const stores = await prisma.reseller.findMany({ where: { status: 'APPROVED' }, select: { storeSlug: true } });
    return [
      ...staticRoutes,
      ...products.map(p => ({ url: `${base}/product/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...stores.map(s => ({ url: `${base}/store/${s.storeSlug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ];
  } catch {
    return staticRoutes;
  }
}
