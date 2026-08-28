import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const riders = await prisma.rider.findMany({ orderBy: { createdAt: 'desc' }, include: { User: { select: { phone: true, email: true } } } });
  return NextResponse.json({ status: 'success', data: riders.map(r => ({ id: r.id, active: r.active, city: r.city, earningsBalance: Number(r.earningsBalance), createdAt: r.createdAt, user: r.User })) });
}
