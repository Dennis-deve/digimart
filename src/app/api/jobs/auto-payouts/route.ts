import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {sendTransfer, transfersConfigured, transferChannelFor} from '@/lib/moolre-transfer';
import {sendSms} from '@/lib/notify';

/** Nightly auto-payouts: sends mature PENDING payouts (seller/reseller/rider/customer)
 *  via Moolre transfer (PRIVATE key). Anything without a complete MoMo destination or a
 *  documented channel stays PENDING for admin — never fake-paid.
 *  Cron (hourly/nightly): POST /api/jobs/auto-payouts with Bearer JOBS_TOKEN */
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
  if (!process.env.JOBS_TOKEN || token !== process.env.JOBS_TOKEN) return NextResponse.json({ status: 'error', message: 'Unauthorized job request.' }, { status: 401 });
  const matureMinutes = Number(process.env.AUTO_PAYOUT_AFTER_MINUTES ?? '60');
  const cutoff = new Date(Date.now() - (Number.isFinite(matureMinutes) ? matureMinutes : 60) * 60_000);
  if (!transfersConfigured()) return NextResponse.json({ status: 'success', data: { skipped: 'Moolre transfers not configured (MOOLRE_API_PRIVKEY) — payouts remain PENDING for manual payment.' } });

  const payouts = await prisma.payout.findMany({ where: { status: 'PENDING', requestedAt: { lte: cutoff } }, take: 25, include: { Seller: true, Reseller: true } });
  let paid = 0, left = 0; const errors: string[] = [];
  for (const p of payouts) {
    const dest = (p.destination ?? null) as { momo?: string; network?: string; name?: string } | null;
    const holder = p.Seller ?? p.Reseller ?? (dest ? { payoutMomo: dest.momo ?? null, payoutNetwork: dest.network ?? null, userId: null } : null);
    const recipient = p.Seller?.payoutMomo ?? p.Reseller?.payoutMomo ?? dest?.momo ?? null;
    const network = p.Seller?.payoutNetwork ?? p.Reseller?.payoutNetwork ?? dest?.network ?? '';
    const channel = transferChannelFor(network);
    if (!recipient || !channel) { left++; continue; }
    const externalref = `DM_payout_${p.id}_${Date.now()}`;
    try {
      const result = await sendTransfer({ receiver: recipient, channel, amount: Number(p.amount), externalref });
      if (!result.ok) { left++; errors.push(`${p.id}: ${result.message}`); continue; }
      await prisma.payout.update({ where: { id: p.id }, data: { status: 'PAID', momoRef: externalref, paidAt: new Date() } });
      paid++;
      const userId = p.Seller?.userId ?? p.Reseller?.userId ?? p.userId;
      if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
        if (u?.phone) await sendSms(u.phone, `DigiMart: GH₵${Number(p.amount).toFixed(2)} payout sent to ${recipient}. Ref ${externalref}.`);
      }
    } catch { left++; }
  }
  return NextResponse.json({ status: 'success', data: { considered: payouts.length, paid, stillPending: left, errors: errors.slice(0, 3) } });
}
