import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {sendTransfer, transfersConfigured, transferChannelFor} from '@/lib/moolre-transfer';
import {sendSms} from '@/lib/notify';

/** Sends a pending payout directly to the seller/reseller MoMo account via Moolre transfer
 *  (private key). Only marks PAID when Moolre accepts the transfer — no false success. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  if (!transfersConfigured()) return NextResponse.json({ status: 'error', message: 'Moolre transfers are not configured (set MOOLRE_API_PRIVKEY).' }, { status: 503 });
  const payout = await prisma.payout.findUnique({ where: { id }, include: { Seller: true, Reseller: true } });
  if (!payout) return NextResponse.json({ status: 'error', message: 'Payout not found.' }, { status: 404 });
  if (payout.status !== 'PENDING') return NextResponse.json({ status: 'error', message: 'This payout is already processed.' }, { status: 409 });
  const holder = payout.Seller ?? payout.Reseller;
  const recipient = holder?.payoutMomo;
  const network = holder?.payoutNetwork ?? '';
  const channel = transferChannelFor(network);
  if (!holder || !recipient || !channel) return NextResponse.json({ status: 'error', message: 'Recipient has no complete payout account, or no Moolre transfer channel for this network yet (set MOOLRE_TRF_TELECEL / MOOLRE_TRF_AT).' }, { status: 400 });

  const externalref = `DM_payout_${payout.id}_${Date.now()}`;
  const result = await sendTransfer({ receiver: recipient, channel, amount: Number(payout.amount), externalref });
  if (!result.ok) return NextResponse.json({ status: 'error', message: `Moolre: ${result.message ?? 'transfer rejected'}` }, { status: 502 });

  await prisma.payout.update({ where: { id: payout.id }, data: { status: 'PAID', momoRef: externalref, paidAt: new Date() } });
  const user = payout.Seller ? await prisma.seller.findUnique({ where: { id: payout.Seller.id }, include: { User: true } }) : await prisma.reseller.findUnique({ where: { id: payout.Reseller!.id }, include: { User: true } });
  if (user?.User?.phone) await sendSms(user.User.phone, `DigiMart: GH₵${Number(payout.amount).toFixed(2)} payout sent to ${recipient}. Reference ${externalref}.`);
  return NextResponse.json({ status: 'success', data: { id: payout.id, status: 'PAID', reference: externalref } });
}
