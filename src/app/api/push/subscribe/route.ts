import {NextResponse} from 'next/server';
import {z} from 'zod';
import {readSession} from '@/lib/session';
import {prisma} from '@/lib/db';
import {pushPublicKey} from '@/lib/push';

export async function GET() {
  const key = pushPublicKey();
  return NextResponse.json({ status: 'success', data: { publicKey: key, enabled: Boolean(key) } });
}

const schema = z.object({ endpoint: z.string().url().max(600), keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }) });

export async function POST(request: Request) {
  const token = request.headers.get('cookie')?.match(/digimart_session=([^;]+)/)?.[1];
  const session = token ? await readSession(decodeURIComponent(token)) : null;
  if (!session) return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 });
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Invalid push subscription.' }, { status: 400 });
  const { endpoint, keys } = input.data;
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { id: crypto.randomUUID(), userId: session.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: session.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ status: 'success', data: { subscribed: true, renewed: Boolean(existing) } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const token = request.headers.get('cookie')?.match(/digimart_session=([^;]+)/)?.[1];
  const session = token ? await readSession(decodeURIComponent(token)) : null;
  if (!session) return NextResponse.json({ status: 'error', message: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.endpoint === 'string') await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: session.id } });
  return NextResponse.json({ status: 'success', data: { subscribed: false } });
}
