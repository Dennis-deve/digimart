import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

/** Store analytics for the signed-in seller OR reseller: visits, orders, conversion, best sellers. */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['SELLER', 'RESELLER', 'CUSTOMER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  const reseller = seller ? null : await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  const store = seller?.approved ? { kind: 'seller', slug: seller.storeSlug, id: seller.id } : reseller?.status === 'APPROVED' ? { kind: 'reseller', slug: reseller.storeSlug, id: reseller.id } : null;
  if (!store) return NextResponse.json({ status: 'success', data: { store: null } });

  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [visits30, visits7, orders, best] = await Promise.all([
    prisma.storeStat.count({ where: { slug: store.slug, createdAt: { gte: since30 } } }),
    prisma.storeStat.count({ where: { slug: store.slug, createdAt: { gte: since7 } } }),
    prisma.order.findMany({
      where: store.kind === 'seller' ? { sellerStoreId: store.id, createdAt: { gte: since30 } } : { resellerId: store.id, createdAt: { gte: since30 } },
      select: { total: true, status: true, OrderItem: { select: { qty: true, unitPrice: true, basePrice: true, Product: { select: { name: true } } } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: store.kind === 'seller' ? { Order: { sellerStoreId: store.id }, Product: { sellerId: store.id } } : { Order: { resellerId: store.id } },
      _sum: { qty: true }, take: 5, orderBy: { _sum: { qty: 'desc' } },
    }),
  ]);
  const productIds = best.map(b => b.productId);
  const names = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(names.map(n => [n.id, n.name]));
  const completed = orders.filter(o => o.status === 'COMPLETED');
  const revenue30 = orders.reduce((s, o) => s + Number(o.total), 0);
  const earnings30 = orders.reduce((s, o) => s + o.OrderItem.reduce((x, i) => store.kind === 'reseller' ? x + (Number(i.unitPrice) - Number(i.basePrice)) * i.qty : x + Number(i.unitPrice) * i.qty, 0), 0);
  return NextResponse.json({ status: 'success', data: {
    store: { kind: store.kind, slug: store.slug },
    visits7, visits30,
    orders30: orders.length,
    completed30: completed.length,
    conversion: visits30 > 0 ? Math.round(orders.length / visits30 * 1000) / 10 : 0,
    revenue30: Math.round(revenue30 * 100) / 100,
    earnings30: Math.round(earnings30 * 100) / 100,
    bestSellers: best.map(b => ({ name: nameById.get(b.productId) ?? b.productId, qty: b._sum.qty ?? 0 })),
  } });
}
