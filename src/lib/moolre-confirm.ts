import {prisma} from '@/lib/db';
import {startFulfillment} from '@/lib/fulfillment';
import {sendSms} from '@/lib/notify';
import {createNotification} from '@/lib/notify-user';

/** Applies a verified Moolre payment outcome exactly once — shared by the webhook
 *  and the status-polling job. Success flips the order to PROCESSING and starts
 *  fulfilment; failure marks it FAILED. Idempotent: an already-processed order
 *  (not PENDING) is skipped, so duplicate callbacks can never double-fulfil. */
export async function applyMoolrePaymentResult(ref: string, success: boolean, transactionId: string | null = null): Promise<{ applied: boolean; kind: 'reseller-fee' | 'order' | 'none'; id?: string }> {
  if (ref.startsWith('DM_reseller_fee_')) {
    const reseller = await prisma.reseller.findFirst({ where: { feePaymentRef: ref } });
    if (!reseller) return { applied: false, kind: 'none' };
    await prisma.reseller.update({ where: { id: reseller.id }, data: { feePaid: success } });
    return { applied: true, kind: 'reseller-fee', id: reseller.id };
  }
  const order = await prisma.order.findFirst({ where: { paymentRef: ref } });
  if (!order) return { applied: false, kind: 'none' };
  if (order.status !== 'PENDING') return { applied: false, kind: 'order', id: order.id }; // already processed — idempotent skip

  await prisma.order.update({ where: { id: order.id }, data: { status: success ? 'PROCESSING' : 'FAILED' } });
  if (success && order.couponCode) await prisma.coupon.update({ where: { code: order.couponCode }, data: { usageCount: { increment: 1 } } });
  if (order.customerId) await createNotification({ userId: order.customerId, title: success ? 'Payment confirmed' : 'Payment failed', message: success ? 'We received your payment and are processing your order.' : 'Your payment was not confirmed. No fulfilment has started.', type: 'PAYMENT' });
  await sendSms(order.customerPhone, success ? `DigiMart: payment confirmed for order ${order.id}. Fulfilment has started — track it in the app.` : `DigiMart: payment for order ${order.id} was NOT confirmed. No money moved and no fulfilment started.`);
  if (success && order.deliveryMethod === 'DELIVERY' && !await prisma.delivery.findUnique({ where: { orderId: order.id } })) {
    const address = order.deliveryAddressId ? await prisma.customerAddress.findUnique({ where: { id: order.deliveryAddressId } }) : null;
    const snap = (order.deliveryAddressSnapshot ?? null) as { address?: string } | null;
    await prisma.delivery.create({ data: { id: crypto.randomUUID(), orderId: order.id, status: 'AVAILABLE', pickupAddress: 'DigiMart/Seller pickup pending', deliveryAddress: address?.address ?? snap?.address ?? null, deliveryFee: order.deliveryFee } });
    if (order.customerId) await createNotification({ userId: order.customerId, title: 'Delivery request created', message: 'Your physical order is ready to be assigned to a rider.', type: 'DELIVERY' });
  }
  if (success) await startFulfillment(order.id);
  return { applied: true, kind: 'order', id: order.id };
}
