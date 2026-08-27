import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {audit} from '@/lib/audit';

/** Escape hatch for reseller registration fees paid outside Moolre (bank/cash/manual
 *  transfer). Lets the flow proceed to approval even while the payment API is blocked. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  const reseller = await prisma.reseller.findUnique({ where: { id } });
  if (!reseller) return NextResponse.json({ status: 'error', message: 'Reseller not found.' }, { status: 404 });
  if (reseller.feePaid) return NextResponse.json({ status: 'error', message: 'Fee is already marked as paid.' }, { status: 409 });
  await prisma.reseller.update({ where: { id }, data: { feePaid: true, feePaymentRef: reseller.feePaymentRef ?? `MANUAL_${Date.now()}` } });
  await audit({ actorId: guard.session!.id, action: 'RESELLER_FEE_MARKED_PAID', entityType: 'Reseller', entityId: id, metadata: { manual: true } });
  return NextResponse.json({ status: 'success', data: { id, feePaid: true } });
}
