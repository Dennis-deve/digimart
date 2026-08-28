import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import { siteUrl } from '@/lib/site-url';

// Public storefront — works for BOTH approved resellers and approved sellers.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await prisma.storeStat.create({ data: { id: crypto.randomUUID(), slug } }).catch(() => undefined);
  const reseller = await prisma.reseller.findUnique({ where: { storeSlug: slug }, include: { User: { select: { phone: true } } } });
  if (reseller && reseller.status === 'APPROVED') {
    const products = await prisma.product.findMany({ where: { inStock: true, isExcluded: false, OR: [{ sellerId: null }, { AND: [{ sellerId: { not: null } }, { approvalStatus: 'APPROVED' }, { onPlatform: true }] }] }, orderBy: { createdAt: 'desc' }, take: 60 });
    const markups = await prisma.resellerProductMarkup.findMany({ where: { resellerId: reseller.id } });
    const markupByProduct = new Map(markups.map(m => [m.productId, Number(m.markupPct)]));
    const defaultMarkup = Number(reseller.defaultMarkupPct);
    const price = (id: string, base: number) => Math.round(base * (1 + (markupByProduct.get(id) ?? defaultMarkup) / 100) * 100) / 100;
    return NextResponse.json({ status: 'success', data: {
      kind: 'reseller',
      store: { name: reseller.storeName, slug: reseller.storeSlug, phone: reseller.User.phone, tagline: reseller.storeTagline, color: reseller.storeColor, banner: reseller.storeBanner, shareUrl: `${siteUrl()}/store/${reseller.storeSlug}` },
      products: products.map(p => ({ id: p.id, name: p.name, category: p.category, network: p.network, basePrice: Number(p.basePrice), price: price(p.id, Number(p.basePrice)), images: p.images, inStock: p.inStock, variants: p.variants })),
    } });
  }
  const seller = await prisma.seller.findUnique({ where: { storeSlug: slug }, include: { User: { select: { phone: true } } } });
  if (seller && seller.approved) {
    // Seller stores list ONLY the seller's own approved inventory (their prices).
    const products = await prisma.product.findMany({ where: { sellerId: seller.id, approvalStatus: 'APPROVED', inStock: true, isExcluded: false }, orderBy: { createdAt: 'desc' }, take: 60 });
    return NextResponse.json({ status: 'success', data: {
      kind: 'seller',
      store: { name: seller.storeName, slug: seller.storeSlug, phone: seller.User.phone, tagline: 'Seller store — direct from the owner', color: '#071c42', banner: seller.storeBanner, shareUrl: `${siteUrl()}/store/${seller.storeSlug}` },
      products: products.map(p => ({ id: p.id, name: p.name, category: p.category, network: p.network, basePrice: Number(p.basePrice), price: Number(p.basePrice), images: p.images, inStock: p.inStock, variants: p.variants })),
    } });
  }
  return NextResponse.json({ status: 'error', message: 'Store not found.' }, { status: 404 });
}
