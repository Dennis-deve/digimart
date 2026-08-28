import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

const schema = z.object({ momoName: z.string().min(2).max(120), momoNumber: z.string().regex(/^0\d{9}$/, 'Use a valid 10-digit Mobile Money number.'), network: z.enum(['MTN', 'Telecel', 'AirtelTigo']) });

/** Withdraw wallet balance to Mobile Money. Creates an admin-payable payout request
 *  (same queue as sellers/resellers). Minimum GH₵5, one pending request at a time. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER', 'SELLER', 'RIDER', 'SUPPORT', 'ADMIN']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid withdrawal request.' }, { status: 400 });
  const wallet = await prisma.wallet.findUnique({ where: { userId: guard.session!.id } });
  const balance = Number(wallet?.balance ?? 0);
  if (balance < 5) return NextResponse.json({ status: 'error', message: `Minimum withdrawal is GH₵5.00. Your balance is GH₵${balance.toFixed(2)}.` }, { status: 400 });
  const pending = await prisma.payout.findFirst({ where: { userId: guard.session!.id, status: 'PENDING' } });
  if (pending) return NextResponse.json({ status: 'error', message: 'You already have a pending withdrawal request.' }, { status: 409 });
  await prisma.$transaction([
    prisma.wallet.update({ where: { id: wallet!.id }, data: { balance: 0 } }),
    prisma.payout.create({ data: { id: crypto.randomUUID(), userId: guard.session!.id, amount: wallet!.balance, status: 'PENDING', destination: { kind: 'WALLET_WITHDRAWAL', name: input.data.momoName, momo: input.data.momoNumber, network: input.data.network } } }),
    prisma.walletEntry.create({ data: { id: crypto.randomUUID(), walletId: wallet!.id, type: 'WITHDRAWAL_PENDING', amount: -wallet!.balance, balanceAfter: 0, reference: 'WITHDRAWAL-REQUEST' } }),
  ]);
  return NextResponse.json({ status: 'success', data: { message: `Withdrawal of GH₵${balance.toFixed(2)} requested. Admin will send it to ${input.data.momoNumber} (${input.data.network}).` } }, { status: 201 });
}
