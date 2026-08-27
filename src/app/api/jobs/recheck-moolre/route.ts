import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {getPaymentStatus} from '@/lib/moolre';
import {applyMoolrePaymentResult} from '@/lib/moolre-confirm';

/** Safety net for Moolre payments: polls the status API for recent PENDING orders
 *  (and unpaid reseller fees) and applies the same verified logic as the webhook.
 *  Protects against missed/delayed webhooks. JOBS_TOKEN-protected; run every 5 min:
 *  curl -X POST -H "Authorization: Bearer $JOBS_TOKEN" https://YOUR-DOMAIN/api/jobs/recheck-moolre */
const FAIL_VALUES = new Set(['2', 'FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED']);

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
  if (!process.env.JOBS_TOKEN || token !== process.env.JOBS_TOKEN) return NextResponse.json({ status: 'error', message: 'Unauthorized job request.' }, { status: 401 });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({ where: { status: 'PENDING', paymentRef: { not: null }, createdAt: { gte: since } }, select: { paymentRef: true }, take: 50 });
  const resellers = await prisma.reseller.findMany({ where: { feePaid: false, feePaymentRef: { not: null }, createdAt: { gte: since } }, select: { feePaymentRef: true }, take: 20 });
  const refs = [...new Set([...orders.map(o => o.paymentRef!), ...resellers.map(r => r.feePaymentRef!)])];
  let confirmed = 0, failed = 0, pending = 0;
  for (const ref of refs) {
    try {
      const body = await getPaymentStatus(ref) as { status?: number | string; data?: { txstatus?: number | string } };
      const success = String(body.status) === '1' && String(body.data?.txstatus ?? '1') === '1';
      const tx = String(body.data?.txstatus ?? '').toUpperCase();
      if (success) { await applyMoolrePaymentResult(ref, true); confirmed++; }
      else if (FAIL_VALUES.has(tx)) { await applyMoolrePaymentResult(ref, false); failed++; }
      else pending++;
    } catch { pending++; }
  }
  return NextResponse.json({ status: 'success', data: { checked: refs.length, confirmed, failed, stillPending: pending } });
}
