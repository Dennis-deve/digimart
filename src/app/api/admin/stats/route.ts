import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const [ordersTotal, ordersToday, gross, pendingPayments, failed, productsActive, productsHidden, usersByRole, ticketsOpen, resellersPending, payoutsPending, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'FAILED' } }),
    prisma.product.count({ where: { inStock: true, isExcluded: false } }),
    prisma.product.count({ where: { OR: [{ inStock: false }, { isExcluded: true }] } }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.reseller.count({ where: { status: 'PENDING' } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { OrderItem: { include: { Product: { select: { name: true } } } } } }),
  ]);

  const users = Object.fromEntries(usersByRole.map(r => [r.role, r._count]));
  return NextResponse.json({ status: 'success', data: {
    ordersTotal, ordersToday,
    grossSales: Number(gross._sum.total ?? 0),
    pendingPayments, failed,
    productsActive, productsHidden,
    users,
    ticketsOpen, resellersPending, payoutsPending,
    recentOrders: recent.map(o => ({ id: o.id, createdAt: o.createdAt, customerPhone: o.customerPhone, status: o.status, total: Number(o.total), itemCount: o.OrderItem.length, firstItem: o.OrderItem[0]?.Product?.name ?? '—' })),
  } });
}
