import {NextResponse} from 'next/server';
import {z} from 'zod';
import {clientIp,limited} from '@/lib/rate-limit';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

const schema = z.object({ productId: z.string().min(1).max(80), rating: z.number().int().min(1).max(5), comment: z.string().min(4).max(1000).optional() });

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({ status: 'error', message: 'productId is required.' }, { status: 400 });
  const reviews = await prisma.review.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 50, include: { User: { select: { phone: true } } } });
  return NextResponse.json({ status: 'success', data: reviews.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, reviewer: r.User.phone.slice(0, 4) + '****' + r.User.phone.slice(-2) })) });
}

export async function POST(request: Request) {
  const gate = limited(`review:${clientIp(request)}`, 5, 60_000);
  if (!gate.allowed) return NextResponse.json({ status: 'error', message: 'Too many review attempts. Please wait.' }, { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } });
  const guard = await requireRole(request, ['CUSTOMER', 'RESELLER', 'SELLER', 'RIDER', 'SUPPORT', 'ADMIN']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid review.' }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id: input.data.productId } });
  if (!product) return NextResponse.json({ status: 'error', message: 'Product not found.' }, { status: 404 });
  try {
    const review = await prisma.review.create({ data: { id: crypto.randomUUID(), productId: input.data.productId, userId: guard.session!.id, rating: input.data.rating, comment: input.data.comment } });
    return NextResponse.json({ status: 'success', data: { id: review.id, rating: review.rating } }, { status: 201 });
  } catch {
    return NextResponse.json({ status: 'error', message: 'You have already reviewed this product.' }, { status: 409 });
  }
}
