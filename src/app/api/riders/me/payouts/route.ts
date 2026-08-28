import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

const schema = z.object({ momoName: z.string().min(2).max(120), momoNumber: z.string().regex(/^0\d{9}$/, 'Use a valid 10-digit Mobile Money number.'), network: z.enum(['MTN', 'Telecel', 'AirtelTigo']) });

/** Rider earnings payout request (min GH₵5, one pending at a time). Paid by admin via Moolre transfer or manually. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['RIDER']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid payout request.' }, { status: 400 });
  const rider = await prisma.rider.findUnique({ where: { userId: guard.session!.id } });
  if (!rider || !rider.active) return NextResponse.json({ status: 'error', message: 'An active rider account is required.' }, { status: 403 });
  const balance = Number(rider.earningsBalance);
  if (balance < 5) return NextResponse.json({ status: 'error', message: `Minimum payout is GH₵5.00. Your earnings are GH₵${balance.toFixed(2)}.` }, { status: 400 });
  const pending = await prisma.payout.findFirst({ where: { userId: guard.session!.id, status: 'PENDING', destination: { path: ['kind'], equals: 'RIDER_EARNINGS' } } });
  if (pending) return NextResponse.json({ status: 'error', message: 'You already have a pending payout request.' }, { status: 409 });
  await prisma.$transaction([
    prisma.rider.update({ where: { id: rider.id }, data: { earningsBalance: 0 } }),
    prisma.payout.create({ data: { id: crypto.randomUUID(), userId: guard.session!.id, amount: rider.earningsBalance, status: 'PENDING', destination: { kind: 'RIDER_EARNINGS', name: input.data.momoName, momo: input.data.momoNumber, network: input.data.network } } }),
  ]);
  return NextResponse.json({ status: 'success', data: { message: `Payout of GH₵${balance.toFixed(2)} requested — admin will send it to ${input.data.momoNumber} (${input.data.network}).` } }, { status: 201 });
}
