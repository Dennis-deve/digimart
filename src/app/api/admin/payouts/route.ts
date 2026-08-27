import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {transfersConfigured, transferChannelFor} from '@/lib/moolre-transfer';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const payouts = await prisma.payout.findMany({
    orderBy: { requestedAt: 'desc' }, take: 100,
    include: { Seller: { select: { storeName: true, payoutName: true, payoutMomo: true, payoutNetwork: true } }, Reseller: { select: { storeName: true, payoutName: true, payoutMomo: true, payoutNetwork: true } } },
  });
  return NextResponse.json({ status: 'success', data: payouts.map(p => ({
    id: p.id, amount: Number(p.amount), status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt, momoRef: p.momoRef,
    recipient: p.Seller?.payoutMomo ?? p.Reseller?.payoutMomo ?? null,
    recipientName: p.Seller?.payoutName ?? p.Reseller?.payoutName ?? null,
    recipientNetwork: p.Seller?.payoutNetwork ?? p.Reseller?.payoutNetwork ?? null,
    store: p.Seller?.storeName ?? p.Reseller?.storeName ?? null,
    kind: p.Seller ? 'seller' : 'reseller',
    moolreReady: Boolean((p.Seller?.payoutMomo ?? p.Reseller?.payoutMomo) && transfersConfigured() && transferChannelFor((p.Seller?.payoutNetwork ?? p.Reseller?.payoutNetwork) ?? '') !== undefined),
  })) });
}
