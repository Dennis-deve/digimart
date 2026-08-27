import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const refunds = await prisma.refund.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  const orders = await prisma.order.findMany({ where: { id: { in: refunds.map(r => r.orderId) } }, select: { id: true, customerPhone: true, paymentRef: true } });
  const byId = new Map(orders.map(o => [o.id, o]));
  return NextResponse.json({ status: 'success', data: refunds.map(r => ({ id: r.id, orderId: r.orderId, userId: r.userId, amount: Number(r.amount), reason: r.reason, status: r.status, resolutionNote: r.resolutionNote, refundReference: r.refundReference, createdAt: r.createdAt, customerPhone: byId.get(r.orderId)?.customerPhone ?? null, paymentRef: byId.get(r.orderId)?.paymentRef ?? null })) });
}
