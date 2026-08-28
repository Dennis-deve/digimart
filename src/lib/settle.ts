import {createNotification} from '@/lib/notify-user';
import {prisma} from '@/lib/db';
import {sellerDirectCommissionPct, sellerPlatformCommissionPct, storeAffiliatePct} from '@/lib/fees';
import {sendSms} from '@/lib/notify';
const round2 = (n: number) => Math.round(n * 100) / 100;
export const sellerCommissionPct = () => { const v = Number(process.env.SELLER_COMMISSION_PCT ?? '10'); return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 10; };

/**
 * Recomputes an order's status from its items and — exactly once, on the transition to
 * COMPLETED — credits seller earnings (gross minus platform commission) and reseller
 * markup earnings, creates notifications and sends best-effort SMS.
 * Safe to call from every provider callback / job: it no-ops unless the status changes.
 */
export async function recomputeAndSettle(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { OrderItem: { include: { Product: { include: { seller: true } } } } } });
  if (!order) return null;
  const allFulfilled = order.OrderItem.length > 0 && order.OrderItem.every(i => i.fulfillment === 'FULFILLED');
  const anyFailed = order.OrderItem.some(i => i.fulfillment === 'FAILED');
  const newStatus: 'COMPLETED' | 'PROCESSING' | 'FAILED' = allFulfilled ? 'COMPLETED' : anyFailed ? 'FAILED' : 'PROCESSING';
  if (newStatus === order.status) return { status: newStatus, settled: false };
  await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
  if (newStatus !== 'COMPLETED') return { status: newStatus, settled: false };

  // Reseller markup earnings (unitPrice includes their markup over basePrice)
  if (order.resellerId) {
    const markup = round2(order.OrderItem.reduce((s, i) => s + (Number(i.unitPrice) - Number(i.basePrice)) * i.qty, 0));
    if (markup > 0) {
      await prisma.reseller.update({ where: { id: order.resellerId }, data: { earningsBalance: { increment: markup } } });
      const reseller = await prisma.reseller.findUnique({ where: { id: order.resellerId }, include: { User: true } });
      if (reseller?.User?.phone) await sendSms(reseller.User.phone, `DigiMart: order ${order.id} completed. GH₵${markup.toFixed(2)} markup added to your earnings.`);
    }
  }

  // Seller earnings for physical/admin items (gross minus platform commission)
  const bySeller = new Map<string, number>();
  const affiliateFor = new Map<string, number>();
  for (const item of order.OrderItem) {
    const seller = item.Product?.seller;
    if (item.source !== 'ADMIN') { if (order.sellerStoreId) affiliateFor.set('_store', (affiliateFor.get('_store') ?? 0) + Number(item.basePrice) * item.qty); continue; }
    if (seller?.approved) {
      const ownStore = order.sellerStoreId === seller.id;
      const pct = ownStore ? sellerDirectCommissionPct() : sellerPlatformCommissionPct();
      const net = round2(Number(item.basePrice) * item.qty * (100 - pct) / 100);
      bySeller.set(seller.id, (bySeller.get(seller.id) ?? 0) + net);
    } else if (order.sellerStoreId) {
      affiliateFor.set('_store', (affiliateFor.get('_store') ?? 0) + Number(item.basePrice) * item.qty);
    }
  }
  // Affiliate: the store owner earns a small cut when products that are NOT theirs sell via their link
  const affiliateBase = affiliateFor.get('_store') ?? 0;
  if (affiliateBase > 0 && order.sellerStoreId) {
    const storeSeller = await prisma.seller.findUnique({ where: { id: order.sellerStoreId } });
    if (storeSeller?.approved) {
      const cut = round2(affiliateBase * storeAffiliatePct() / 100);
      if (cut > 0) { bySeller.set(storeSeller.id, (bySeller.get(storeSeller.id) ?? 0) + cut); }
    }
  }
  for (const [sellerId, amount] of bySeller) {
    if (amount <= 0) continue;
    await prisma.seller.update({ where: { id: sellerId }, data: { earningsBalance: { increment: amount } } });
    const seller = await prisma.seller.findUnique({ where: { id: sellerId }, include: { User: true } });
    if (seller?.User?.phone) await sendSms(seller.User.phone, `DigiMart: order ${order.id} completed. GH₵${amount.toFixed(2)} added to your earnings (after ${sellerCommissionPct()}% commission).`);
  }

  if (order.customerId) await createNotification({ userId: order.customerId, title: 'Order completed', message: `Order ${order.id} is complete. Thank you for shopping with DigiMart!`, type: 'ORDER' });
  await sendSms(order.customerPhone, `DigiMart: order ${order.id} completed. Thank you for shopping with us.`);
  return { status: newStatus, settled: true };
}
