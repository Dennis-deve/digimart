import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {initiateMoolreCollection} from '@/lib/providers';
import {clientIp,limited} from '@/lib/rate-limit';

const schema = z.object({ amount: z.number().min(1).max(2000), provider: z.enum(['MTN', 'Telecel', 'AirtelTigo']) });

/** Wallet top-up: starts a Moolre collection. The wallet is credited ONLY by the
 *  verified Moolre webhook (or the status-poll job) — never by this endpoint. */
export async function POST(request: Request) {
  const gate = limited(`wallet-topup:${clientIp(request)}`, 5, 60_000);
  if (!gate.allowed) return NextResponse.json({ status: 'error', message: 'Too many top-up attempts. Please wait a minute.' }, { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } });
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER', 'SELLER', 'RIDER', 'SUPPORT', 'ADMIN']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Enter an amount between GH₵1 and GH₵2,000.' }, { status: 400 });
  const wallet = await prisma.wallet.upsert({ where: { userId: guard.session!.id }, create: { id: crypto.randomUUID(), userId: guard.session!.id, balance: 0 }, update: {} });
  const user = await prisma.user.findUnique({ where: { id: guard.session!.id }, select: { phone: true } });
  const ref = `DM_wallet_${wallet.id}_${Date.now()}`;
  await prisma.walletEntry.create({ data: { id: crypto.randomUUID(), walletId: wallet.id, type: 'TOPUP_PENDING', amount: input.data.amount, balanceAfter: Number(wallet.balance), reference: `INTENT-${ref}` } });
  try {
    const payment = await initiateMoolreCollection({ payer: user?.phone ?? '', amount: input.data.amount, channel: input.data.provider, externalref: ref, reference: wallet.id });
    return NextResponse.json({ status: 'success', data: { reference: ref, amount: input.data.amount, instructions: payment.instructions, notice: 'Your wallet is credited automatically once the payment is server-side verified.' } }, { status: 201 });
  } catch (error) {
    await prisma.walletEntry.deleteMany({ where: { walletId: wallet.id, reference: `INTENT-${ref}` } });
    const reason = error instanceof Error && error.message ? ` — ${error.message}` : '';
    return NextResponse.json({ status: 'error', message: `Top-up is unavailable right now${reason}.` }, { status: 502 });
  }
}
