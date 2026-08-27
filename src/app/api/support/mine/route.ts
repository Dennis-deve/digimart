import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {readSession} from '@/lib/session';

export async function GET(request: Request) {
  const token = request.headers.get('cookie')?.match(/digimart_session=([^;]+)/)?.[1];
  const session = token ? await readSession(decodeURIComponent(token)) : null;
  if (!session) return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 });
  const tickets = await prisma.supportTicket.findMany({ where: { userId: session.id }, orderBy: { updatedAt: 'desc' }, take: 30, include: { SupportMessage: { orderBy: { createdAt: 'asc' } } } });
  return NextResponse.json({ status: 'success', data: tickets.map(t => ({ id: t.id, topic: t.topic, orderNo: t.orderNo, status: t.status, createdAt: t.createdAt, messages: t.SupportMessage })) });
}
