import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

const createSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9-]+$/, 'Use A–Z, 0–9 and dashes only.'),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discountValue: z.number().positive(),
  minimumOrder: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  endsAt: z.string().optional(), // ISO date — makes it a flash sale
});

async function myStore(request: Request) {
  const guard = await requireRole(request, ['SELLER', 'RESELLER']);
  if (guard.response) return { error: guard.response };
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (seller?.approved) return { slug: seller.storeSlug };
  const reseller = await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  if (reseller?.status === 'APPROVED') return { slug: reseller.storeSlug };
  return { error: NextResponse.json({ status: 'error', message: 'Approved store required.' }, { status: 403 }) };
}

export async function GET(request: Request) {
  const store = await myStore(request);
  if (store.error) return store.error;
  const coupons = await prisma.coupon.findMany({ where: { storeSlug: store.slug }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ status: 'success', data: coupons.map(c => ({ id: c.id, code: c.code, discountType: c.discountType, discountValue: Number(c.discountValue), minimumOrder: c.minimumOrder ? Number(c.minimumOrder) : null, usageLimit: c.usageLimit, usageCount: c.usageCount, endsAt: c.endsAt, active: c.active })) });
}

export async function POST(request: Request) {
  const store = await myStore(request);
  if (store.error) return store.error;
  const input = createSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid coupon.' }, { status: 400 });
  const c = input.data;
  if (c.discountType === 'PERCENTAGE' && c.discountValue > 100) return NextResponse.json({ status: 'error', message: 'Percentage cannot exceed 100.' }, { status: 400 });
  try {
    const coupon = await prisma.coupon.create({ data: { id: crypto.randomUUID(), code: c.code, discountType: c.discountType, discountValue: c.discountValue, minimumOrder: c.minimumOrder, usageLimit: c.usageLimit, endsAt: c.endsAt ? new Date(c.endsAt) : null, active: true, storeSlug: store.slug } });
    return NextResponse.json({ status: 'success', data: { id: coupon.id, code: coupon.code, message: `Coupon ${coupon.code} is live in your store${coupon.endsAt ? ' until ' + coupon.endsAt.toLocaleDateString('en-GB') : ''}.` } }, { status: 201 });
  } catch { return NextResponse.json({ status: 'error', message: 'That coupon code already exists.' }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  const store = await myStore(request);
  if (store.error) return store.error;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== 'string') return NextResponse.json({ status: 'error', message: 'Coupon id required.' }, { status: 400 });
  const coupon = await prisma.coupon.findUnique({ where: { id: body.id } });
  if (!coupon || coupon.storeSlug !== store.slug) return NextResponse.json({ status: 'error', message: 'Coupon not found.' }, { status: 404 });
  const active = typeof body.active === 'boolean' ? body.active : !coupon.active;
  await prisma.coupon.update({ where: { id: coupon.id }, data: { active } });
  return NextResponse.json({ status: 'success', data: { id: coupon.id, active } });
}
