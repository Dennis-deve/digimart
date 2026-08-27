import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {Prisma} from '@prisma/client';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const where: Prisma.OrderWhereInput = status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status) ? { status: status as Prisma.EnumOrderStatusFilter['equals'] } : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { OrderItem: { include: { Product: { select: { name: true, network: true } } } } },
  });

  return NextResponse.json({ status: 'success', data: orders.map(o => ({
    id: o.id, createdAt: o.createdAt, customerPhone: o.customerPhone, status: o.status,
    total: Number(o.total), discount: Number(o.discount), deliveryFee: Number(o.deliveryFee),
    deliveryMethod: o.deliveryMethod, couponCode: o.couponCode, paymentRef: o.paymentRef,
    items: o.OrderItem.map(i => ({ id: i.id, name: i.Product?.name ?? i.productId, network: i.Product?.network ?? null, source: i.source, qty: i.qty, unitPrice: Number(i.unitPrice), fulfillment: i.fulfillment, externalRef: i.externalRef })),
  })) });
}
