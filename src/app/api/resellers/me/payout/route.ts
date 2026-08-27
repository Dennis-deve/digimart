import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['RESELLER']);
  if (guard.response) return guard.response;
  const reseller = await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  if (!reseller) return NextResponse.json({ status: 'error', message: 'Reseller profile not found.' }, { status: 404 });
  return NextResponse.json({ status: 'success', data: {
    reseller: { id: reseller.id, storeName: reseller.storeName, storeSlug: reseller.storeSlug, status: reseller.status, feePaid: reseller.feePaid, earningsBalance: Number(reseller.earningsBalance), defaultMarkupPct: Number(reseller.defaultMarkupPct), payoutName: reseller.payoutName, payoutMomo: reseller.payoutMomo, payoutNetwork: reseller.payoutNetwork, storeTagline: reseller.storeTagline, storeColor: reseller.storeColor },
  } });
}

const payoutSchema = z.object({ payoutName: z.string().min(2).max(120).optional(), payoutMomo: z.string().regex(/^0\d{9}$/, 'Use a valid 10-digit Mobile Money number.').optional(), payoutNetwork: z.enum(['MTN', 'Telecel', 'AirtelTigo']).optional(), storeTagline: z.string().max(160).optional(), storeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #ffd52b.').optional() }).refine(v => v.payoutName && v.payoutMomo && v.payoutNetwork || (!v.payoutName && !v.payoutMomo && !v.payoutNetwork), { message: 'Set the full payout account (name, number and network) together.' });

export async function PATCH(request: Request) {
  const guard = await requireRole(request, ['RESELLER']);
  if (guard.response) return guard.response;
  const reseller = await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  if (!reseller) return NextResponse.json({ status: 'error', message: 'Reseller profile not found.' }, { status: 404 });
  const input = payoutSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid update.' }, { status: 400 });
  const { storeTagline, storeColor, ...payout } = input.data;
  const data: Record<string, string | null> = {};
  if (storeTagline !== undefined) data.storeTagline = storeTagline;
  if (storeColor !== undefined) data.storeColor = storeColor;
  if (payout.payoutName) { data.payoutName = payout.payoutName; data.payoutMomo = payout.payoutMomo!; data.payoutNetwork = payout.payoutNetwork!; }
  await prisma.reseller.update({ where: { id: reseller.id }, data });
  return NextResponse.json({ status: 'success', data: { message: 'Payout account saved. Earnings will be sent to this Mobile Money account.' } });
}
