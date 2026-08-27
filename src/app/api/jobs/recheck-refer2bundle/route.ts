import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {getRefer2BundleStatus, getRefer2BundleAFAStatus} from '@/lib/providers';
import {recomputeAndSettle} from '@/lib/settle';
import {sendSms} from '@/lib/notify';
import {createNotification} from '@/lib/notify-user';

/** Polls Refer2Bundle data orders (no webhook documented). Same JOBS_TOKEN as the Muviin job.
 *  Cron: every 5 minutes — POST https://YOUR-DOMAIN/api/jobs/recheck-refer2bundle with Bearer JOBS_TOKEN */
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
  if (!process.env.JOBS_TOKEN || token !== process.env.JOBS_TOKEN) return NextResponse.json({ status: 'error', message: 'Unauthorized job request.' }, { status: 401 });
  const items = await prisma.orderItem.findMany({ where: { source: 'REFER2BUNDLE', fulfillment: 'PENDING', externalRef: { not: null } }, take: 100, include: { Product: { select: { name: true, category: true } }, Order: { select: { customerPhone: true, customerId: true } } } });
  let fulfilled = 0, failed = 0, pending = 0;
  const touched = new Set<string>();
  for (const item of items) {
    const isAfa = /afa/i.test(item.Product.category);
    try {
      const result = isAfa ? await getRefer2BundleAFAStatus(item.externalRef!) : await getRefer2BundleStatus(item.externalRef!);
      const status = String(result.status ?? result.data?.status ?? '').toLowerCase();
      if (status === 'success' || status === 'completed' || status === 'delivered' || status === 'approved' || status === 'active') {
        await prisma.orderItem.update({ where: { id: item.id }, data: { fulfillment: 'FULFILLED' } });
        fulfilled++; touched.add(item.orderId);
        if (item.Order?.customerId) await createNotification({ userId: item.Order.customerId, title: isAfa ? 'AFA registration confirmed' : 'Data bundle delivered', message: isAfa ? `Your ${item.Product.name} has been processed. Reference ${item.externalRef}.` : `Your ${item.Product.name} has been delivered to your phone.`, type: 'ORDER' });
        await sendSms(item.Order?.customerPhone ?? '', isAfa ? `DigiMart: your ${item.Product.name} is confirmed. Reference ${item.externalRef}.` : `DigiMart: your ${item.Product.name} has been delivered. Enjoy!`);
      } else if (status === 'failed' || status === 'cancelled' || status === 'rejected') {
        await prisma.orderItem.update({ where: { id: item.id }, data: { fulfillment: 'FAILED' } });
        failed++; touched.add(item.orderId);
      } else pending++;
    } catch { pending++; }
  }
  const settled: string[] = [];
  for (const orderId of touched) { const r = await recomputeAndSettle(orderId); if (r?.settled) settled.push(orderId); }
  return NextResponse.json({ status: 'success', data: { checked: items.length, fulfilled, failed, pending, ordersSettled: settled } });
}
