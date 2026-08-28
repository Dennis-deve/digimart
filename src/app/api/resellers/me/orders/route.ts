import {NextResponse} from 'next/server';import {requireRole} from '@/lib/guards';import {prisma} from '@/lib/db';
/** Reseller order feed: every order placed through their store link + their markup earnings. */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER']);
  if (guard.response) return guard.response;
  const reseller = await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  if (!reseller) return NextResponse.json({ status: 'success', data: { orders: [] } });
  const orders = await prisma.order.findMany({ where: { resellerId: reseller.id }, orderBy: { createdAt: 'desc' }, take: 40, include: { OrderItem: { include: { Product: { select: { name: true } } } } } });
  return NextResponse.json({ status: 'success', data: orders.map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status, total: Number(o.total), itemCount: o.OrderItem.length, firstItem: o.OrderItem[0]?.Product?.name ?? '—', earnings: Math.round(o.OrderItem.reduce((s, i) => s + (Number(i.unitPrice) - Number(i.basePrice)) * i.qty, 0) * 100) / 100 })) });
}
