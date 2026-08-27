import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['RIDER']);
  if (guard.response) return guard.response;
  const rider = await prisma.rider.findUnique({ where: { userId: guard.session!.id } });
  if (!rider || !rider.active) return NextResponse.json({ status: 'error', message: 'An active rider profile is required.' }, { status: 403 });
  const [available, mine, done] = await Promise.all([
    prisma.delivery.findMany({ where: { status: 'AVAILABLE', riderId: null }, orderBy: { createdAt: 'asc' }, take: 30 }),
    prisma.delivery.findMany({ where: { riderId: rider.id, status: { notIn: ['DELIVERED', 'FAILED'] } }, orderBy: { updatedAt: 'desc' }, take: 30 }),
    prisma.delivery.count({ where: { riderId: rider.id, status: 'DELIVERED' } }),
  ]);
  const orders = await prisma.order.findMany({ where: { id: { in: [...available, ...mine].map(d => d.orderId) } }, select: { id: true, customerPhone: true, total: true } });
  const byId = new Map(orders.map(o => [o.id, o]));
  const map = (d: (typeof available)[number]) => ({ id: d.id, orderId: d.orderId, status: d.status, pickupAddress: d.pickupAddress, deliveryAddress: d.deliveryAddress, fee: Number(d.deliveryFee), customerPhone: byId.get(d.orderId)?.customerPhone ?? null, total: byId.get(d.orderId) ? Number(byId.get(d.orderId)!.total) : null });
  return NextResponse.json({ status: 'success', data: { available: available.map(map), mine: mine.map(map), deliveredCount: done } });
}
