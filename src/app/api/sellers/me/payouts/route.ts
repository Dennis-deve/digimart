import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function POST(request: Request) {
  const guard = await requireRole(request, ['SELLER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (!seller) return NextResponse.json({ status: 'error', message: 'Seller profile not found.' }, { status: 404 });
  if (!seller.approved) return NextResponse.json({ status: 'error', message: 'Your seller account must be approved first.' }, { status: 403 });
  if (!seller.payoutMomo || !seller.payoutName || !seller.payoutNetwork) return NextResponse.json({ status: 'error', message: 'Set your payout Mobile Money account first.' }, { status: 400 });
  const balance = Number(seller.earningsBalance);
  if (balance < 5) return NextResponse.json({ status: 'error', message: `Minimum payout is GH₵5.00. Your balance is GH₵${balance.toFixed(2)}.` }, { status: 400 });
  const pending = await prisma.payout.findFirst({ where: { sellerId: seller.id, status: 'PENDING' } });
  if (pending) return NextResponse.json({ status: 'error', message: 'You already have a pending payout request.' }, { status: 409 });
  await prisma.$transaction([
    prisma.seller.update({ where: { id: seller.id }, data: { earningsBalance: 0 } }),
    prisma.payout.create({ data: { id: crypto.randomUUID(), sellerId: seller.id, amount: seller.earningsBalance, status: 'PENDING' } }),
  ]);
  return NextResponse.json({ status: 'success', data: { message: `Payout request for GH₵${balance.toFixed(2)} submitted. Admin will send it to ${seller.payoutMomo} (${seller.payoutNetwork}).` } }, { status: 201 });
}
