import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

/** Admin analytics: 14-day revenue/orders series, status mix, top products, signups. */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const since14 = new Date(Date.now() - 13 * 864e5); since14.setHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 30 * 864e5);

  const [orders, top, users7, partners] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: since14 } }, select: { total: true, status: true, createdAt: true } }),
    prisma.orderItem.groupBy({ by: ['productId'], where: { Order: { createdAt: { gte: since30 } } }, _sum: { qty: true }, _count: { orderId: true }, orderBy: { _count: { orderId: 'desc' } }, take: 5 }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    Promise.all([prisma.seller.count({ where: { approved: false } }), prisma.reseller.count({ where: { status: 'PENDING' } }), prisma.rider.count({ where: { active: false } })]),
  ]);

  // 14-day series
  const days: { label: string; orders: number; revenue: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * 864e5);
    const key = d.toDateString();
    const dayOrders = orders.filter(o => o.createdAt.toDateString() === key);
    days.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), orders: dayOrders.length, revenue: Math.round(dayOrders.reduce((s, o) => s + Number(o.total), 0) * 100) / 100 });
  }
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});
  const names = top.length ? await prisma.product.findMany({ where: { id: { in: top.map(t => t.productId) } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(names.map(n => [n.id, n.name]));

  return NextResponse.json({ status: 'success', data: {
    series: days,
    statusCounts,
    revenue14: Math.round(days.reduce((s, d) => s + d.revenue, 0) * 100) / 100,
    orders14: orders.length,
    topProducts: top.map(t => ({ name: nameById.get(t.productId) ?? t.productId, qty: t._sum.qty ?? 0, orders: t._count.orderId })),
    users7,
    pending: { sellers: partners[0], resellers: partners[1], riders: partners[2] },
  } });
}
