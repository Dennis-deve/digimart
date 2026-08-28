import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

const schema = z.object({ city: z.string().min(2).max(80) });

/** Any signed-in user without a rider profile can apply. Admin activates in /admin/partners. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER', 'SELLER', 'SUPPORT']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Enter the city/area you will deliver in.' }, { status: 400 });
  const existing = await prisma.rider.findUnique({ where: { userId: guard.session!.id } });
  if (existing) return NextResponse.json({ status: 'error', message: existing.active ? 'You are already an active rider.' : 'Your rider application is already under review.' }, { status: 409 });
  const rider = await prisma.rider.create({ data: { id: crypto.randomUUID(), userId: guard.session!.id, city: input.data.city, active: false } });
  return NextResponse.json({ status: 'success', data: { id: rider.id, status: 'UNDER_REVIEW', message: 'Application received! An admin will activate your rider account — your dashboard updates automatically.' } }, { status: 201 });
}
