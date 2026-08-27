import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return NextResponse.json({ status: 'error', message: 'Coupon not found.' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const active = typeof body.active === 'boolean' ? body.active : !coupon.active;
  const updated = await prisma.coupon.update({ where: { id }, data: { active } });
  return NextResponse.json({ status: 'success', data: { id: updated.id, code: updated.code, active: updated.active } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return NextResponse.json({ status: 'error', message: 'Coupon not found.' }, { status: 404 });
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ status: 'success' });
}
