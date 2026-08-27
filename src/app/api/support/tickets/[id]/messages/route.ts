import {createNotification} from '@/lib/notify-user';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {prisma} from '@/lib/db';
import {readSession} from '@/lib/session';

const schema = z.object({ message: z.string().min(1).max(2000), close: z.boolean().optional() });

async function loadContext(request: Request, id: string) {
  const token = request.headers.get('cookie')?.match(/digimart_session=([^;]+)/)?.[1];
  const session = token ? await readSession(decodeURIComponent(token)) : null;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket || !session) return { session, ticket: null, allowed: false as const };
  const isStaff = session.role === 'ADMIN' || session.role === 'SUPPORT';
  const isOwner = ticket.userId === session.id;
  return { session, ticket, allowed: isStaff || isOwner };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, ticket, allowed } = await loadContext(request, id);
  if (!session) return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 });
  if (!ticket || !allowed) return NextResponse.json({ status: 'error', message: 'Ticket not found.' }, { status: 404 });
  const messages = await prisma.supportMessage.findMany({ where: { ticketId: id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ status: 'success', data: { ticket: { id: ticket.id, topic: ticket.topic, orderNo: ticket.orderNo, status: ticket.status }, messages } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, ticket, allowed } = await loadContext(request, id);
  if (!session) return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 });
  if (!ticket || !allowed) return NextResponse.json({ status: 'error', message: 'Ticket not found.' }, { status: 404 });
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Enter a message (1–2000 characters).' }, { status: 400 });
  const isStaff = session.role === 'ADMIN' || session.role === 'SUPPORT';
  const message = await prisma.supportMessage.create({ data: { id: crypto.randomUUID(), ticketId: id, senderRole: isStaff ? 'SUPPORT' : 'CUSTOMER', senderName: isStaff ? 'DigiMart Support' : session.phone, message: input.data.message } });
  await prisma.supportTicket.update({ where: { id }, data: { status: input.data.close ? 'CLOSED' : (isStaff ? 'ANSWERED' : 'OPEN'), updatedAt: new Date() } });
  if (isStaff && ticket.userId) await createNotification({ userId: ticket.userId, title: 'Support replied', message: `DigiMart support replied to ticket ${ticket.id}.`, type: 'SUPPORT', url: '/support' });
  return NextResponse.json({ status: 'success', data: { id: message.id } }, { status: 201 });
}
