import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const sellers = await prisma.seller.findMany({ orderBy: { createdAt: 'desc' }, include: { User: { select: { phone: true, email: true } } } });
  return NextResponse.json({ status: 'success', data: sellers.map(s => ({ id: s.id, storeName: s.storeName, storeSlug: s.storeSlug, approved: s.approved, earningsBalance: Number(s.earningsBalance), payoutMomo: s.payoutMomo, payoutNetwork: s.payoutNetwork, user: s.User })) });
}
