import {prisma} from '@/lib/db';
import {startFulfillment} from '@/lib/fulfillment';
import {sendSms} from '@/lib/notify';
import {createNotification} from '@/lib/notify-user';

/** Applies a verified Moolre payment outcome exactly once — shared by the webhook
 *  and the status-polling job. Success flips the order to PROCESSING and starts
 *  fulfilment; failure marks it FAILED. Idempotent: an already-processed order
 *  (not PENDING) is skipped, so duplicate callbacks can never double-fulfil. */
export async function applyMoolrePaymentResult(ref: string, success: boolean, transactionId: string | null = null): Promise<{ applied: boolean; kind: 'reseller-fee' | 'order' | 'wallet-topup' | 'none'; id?: string }> {
  if (ref.startsWith('DM_wallet_')) {
    const walletId = ref.split('_')[2];
    const existing = await prisma.walletEntry.findFirst({ where: { reference: `TOPUP-${ref}` } });
    if (existing) return { applied: false, kind: 'wallet-topup', id: walletId }; // idempotent
    if (!success) {
      const w = await prisma.wallet.findUnique({ where: { id: walletId } });
      if (w?.userId) await createNotification({ userId: w.userId, title: 'Top-up failed', message: 'Your wallet top-up was not confirmed. No money moved.', type: 'PAYMENT' });
      return { applied: true, kind: 'wallet-topup', id: walletId };
    }
    // Amount is stored at initiation as an INTENT entry (see /api/wallet/topup).
    const intent = await prisma.walletEntry.findFirst({ where: { walletId, reference: `INTENT-${ref}` } });
    const credit = Number(intent?.amount ?? 0);
    if (credit <= 0) return { applied: false, kind: 'wallet-topup', id: walletId };
    const wallet = await prisma.$transaction(async tx => {
      const w = await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: credit } } });
      await tx.walletEntry.create({ data: { id: crypto.randomUUID(), walletId, type: 'TOPUP', amount: credit, balanceAfter: w.balance, reference: `TOPUP-${ref}` } });
      await tx.walletEntry.deleteMany({ where: { walletId, reference: `INTENT-${ref}` } });
      return w;
    });
    await createNotification({ userId: wallet.userId, title: 'Wallet topped up', message: `GH₵${credit.toFixed(2)} added to your DigiMart wallet.`, type: 'PAYMENT' });
    await sendSms((await prisma.user.findUnique({ where: { id: wallet.userId }, select: { phone: true } }))?.phone ?? '', `DigiMart: your wallet top-up of GH₵${credit.toFixed(2)} is complete.`);
    return { applied: true, kind: 'wallet-topup', id: walletId };
  }
  if (ref.startsWith('DM_seller_fee_')) {
    const seller = await prisma.seller.findFirst({ where: { feePaymentRef: ref } });
    if (!seller) return { applied: false, kind: 'none' };
    await prisma.seller.update({ where: { id: seller.id }, data: { feePaid: success } });
    await createNotification({ userId: seller.userId, title: success ? 'Seller fee confirmed' : 'Seller fee payment failed', message: success ? 'Your seller registration fee was received. An admin will now review your store.' : 'Your registration fee payment was not confirmed — try again from your Seller dashboard.', type: 'PAYMENT' });
    return { applied: true, kind: 'order', id: seller.id };
  }
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
