import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {audit} from '@/lib/audit';
import {createNotification} from '@/lib/notify-user';
/** Escape hatch for seller fees paid outside Moolre (cash/bank/manual). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) return NextResponse.json({ status: 'error', message: 'Seller not found.' }, { status: 404 });
  if (seller.feePaid) return NextResponse.json({ status: 'error', message: 'Fee already marked as paid.' }, { status: 409 });
  await prisma.seller.update({ where: { id }, data: { feePaid: true, feePaymentRef: seller.feePaymentRef ?? `MANUAL_${Date.now()}` } });
  await audit({ actorId: guard.session!.id, action: 'SELLER_FEE_MARKED_PAID', entityType: 'Seller', entityId: id, metadata: { manual: true } });
  await createNotification({ userId: seller.userId, title: 'Seller fee received', message: 'Your registration fee was received. Your store is ready for admin approval.', type: 'PAYMENT' });
  return NextResponse.json({ status: 'success', data: { id, feePaid: true } });
}
