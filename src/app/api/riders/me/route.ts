import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

/** Own rider profile — works for applicants too (returns null profile when none). */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER', 'SELLER', 'RIDER', 'SUPPORT']);
  if (guard.response) return guard.response;
  const rider = await prisma.rider.findUnique({ where: { userId: guard.session!.id } });
  if (!rider) return NextResponse.json({ status: 'success', data: { rider: null } });
  return NextResponse.json({ status: 'success', data: { rider: { id: rider.id, active: rider.active, city: rider.city, earningsBalance: Number(rider.earningsBalance) } } });
}
