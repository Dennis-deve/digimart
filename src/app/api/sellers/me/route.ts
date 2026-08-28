import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {sellerCommissionPct} from '@/lib/settle';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'SELLER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (!seller) return NextResponse.json({ status: 'error', message: 'Seller profile not found.' }, { status: 404 });
  const [payouts, queue] = await Promise.all([
    prisma.payout.findMany({ where: { sellerId: seller.id }, orderBy: { requestedAt: 'desc' }, take: 20 }),
    prisma.order.findMany({
      where: { OrderItem: { some: { Product: { sellerId: seller.id } } } },
      orderBy: { createdAt: 'desc' }, take: 50,
      include: { OrderItem: { where: { Product: { sellerId: seller.id } }, include: { Product: { select: { name: true } } } } },
    }),
  ]);
  return NextResponse.json({ status: 'success', data: {
    seller: { id: seller.id, storeName: seller.storeName, storeSlug: seller.storeSlug, approved: seller.approved, registrationFee: Number(seller.registrationFee), feePaid: seller.feePaid, earningsBalance: Number(seller.earningsBalance), payoutName: seller.payoutName, payoutMomo: seller.payoutMomo, payoutNetwork: seller.payoutNetwork, commissionPct: sellerCommissionPct() },
    payouts: payouts.map(p => ({ id: p.id, amount: Number(p.amount), status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt, momoRef: p.momoRef })),
    orderQueue: queue.map(o => ({ id: o.id, createdAt: o.createdAt, customerPhone: o.customerPhone, status: o.status, total: Number(o.total), deliveryMethod: o.deliveryMethod, items: o.OrderItem.map(i => ({ name: i.Product?.name ?? i.productId, qty: i.qty, fulfillment: i.fulfillment, unitPrice: Number(i.unitPrice) })) })),
  } });
}

const payoutSchema = z.object({ payoutName: z.string().min(2).max(120), payoutMomo: z.string().regex(/^0\d{9}$/, 'Use a valid 10-digit Mobile Money number.'), payoutNetwork: z.enum(['MTN', 'Telecel', 'AirtelTigo']) });

export async function PATCH(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'SELLER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (!seller) return NextResponse.json({ status: 'error', message: 'Seller profile not found.' }, { status: 404 });
  const input = payoutSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid payout account.' }, { status: 400 });
  await prisma.seller.update({ where: { id: seller.id }, data: input.data });
  return NextResponse.json({ status: 'success', data: { message: 'Payout account saved. Earnings will be sent to this Mobile Money account.' } });
}
