import {NextResponse} from 'next/server';
import {z} from 'zod';
import {clientIp,limited} from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import {prisma} from '@/lib/db';

// Emergency admin bootstrap: promotes (or creates) an account to ADMIN using the
// server-side ADMIN_RECOVERY_KEY. The key is verified on the SERVER only.
const schema = z.object({ phone: z.string().regex(/^0\d{9}$/), newPassword: z.string().min(8).max(100), recoveryKey: z.string().min(20).max(300) });

export async function POST(request: Request) {
  const gate = limited(`recover-admin:${clientIp(request)}`, 3, 300_000);
  if (!gate.allowed) return NextResponse.json({ status: 'error', message: 'Too many attempts. Wait a few minutes.' }, { status: 429 });
  if (!process.env.ADMIN_RECOVERY_KEY) return NextResponse.json({ status: 'error', message: 'Admin recovery is not configured.' }, { status: 503 });
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: 'Enter a valid phone number, a password of at least 8 characters, and the recovery key.' }, { status: 400 });
  const { phone, newPassword, recoveryKey } = input.data;
  if (recoveryKey !== process.env.ADMIN_RECOVERY_KEY) return NextResponse.json({ status: 'error', message: 'Recovery key is not correct.' }, { status: 403 });
  const hash = await bcrypt.hash(newPassword, 10);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', passwordHash: hash } });
    return NextResponse.json({ status: 'success', data: { message: `${phone} is now an ADMIN. Sign in with the new password.` } });
  }
  await prisma.user.create({ data: { id: crypto.randomUUID(), phone, passwordHash: hash, role: 'ADMIN' } });
  return NextResponse.json({ status: 'success', data: { message: `Admin account created for ${phone}. Sign in with the new password.` } }, { status: 201 });
}
