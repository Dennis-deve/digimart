import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {audit} from '@/lib/audit';
import {createNotification} from '@/lib/notify-user';

/** Activate (or deactivate with ?action=deactivate) a rider. Activation also grants the RIDER role. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  const deactivate = new URL(request.url).searchParams.get('action') === 'deactivate';
  const rider = await prisma.rider.findUnique({ where: { id } });
  if (!rider) return NextResponse.json({ status: 'error', message: 'Rider not found.' }, { status: 404 });
  const active = !deactivate;
  await prisma.rider.update({ where: { id }, data: { active } });
  if (active) await prisma.user.update({ where: { id: rider.userId }, data: { role: 'RIDER' } });
  await audit({ actorId: guard.session!.id, action: active ? 'RIDER_ACTIVATED' : 'RIDER_DEACTIVATED', entityType: 'Rider', entityId: id, metadata: {} });
  await createNotification({ userId: rider.userId, title: active ? 'Rider account activated' : 'Rider account paused', message: active ? 'You are now an active DigiMart rider — open the Rider Center to accept deliveries.' : 'Your rider account has been paused by an administrator.', type: 'ACCOUNT', url: '/rider' });
  return NextResponse.json({ status: 'success', data: { id, active } });
}
