import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';

import {validateProductRules} from '@/lib/product-rules';

const schema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(3000).optional(),
  category: z.string().min(2).max(80),
  network: z.string().max(40).optional(),
  basePrice: z.number().positive(),
  stock: z.boolean().default(true),
  source: z.enum(['ADMIN', 'BUNDLESHOPGH', 'MUVIIN', 'REFER2BUNDLE']).default('ADMIN'),
  sellerId: z.string().optional(),
  images: z.array(z.string().url()).max(8).default([]),
});

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';

async function uniqueId(base: string) {
  let id = base;
  let n = 2;
  while (await prisma.product.findUnique({ where: { id } })) id = `${base}-${n++}`;
  return id;
}

export async function GET(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { OrderItem: true } } } });
  return NextResponse.json({ status: 'success', data: products.map(p => ({ id: p.id, name: p.name, source: p.source, network: p.network, category: p.category, basePrice: Number(p.basePrice), inStock: p.inStock, isExcluded: p.isExcluded, images: p.images, description: p.description, orderCount: p._count.OrderItem })) });
}

export async function POST(request: Request) {
  const guard = await requireRole(request, ['ADMIN']);
  if (guard.response) return guard.response;
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid product.' }, { status: 400 });
  const p = input.data;

  const ruleError = validateProductRules({ source: p.source, category: p.category, network: p.network, name: p.name });
  if (ruleError) return NextResponse.json({ status: 'error', message: ruleError }, { status: 400 });

  let sellerId: string | undefined;
  if (p.sellerId && p.source === 'ADMIN') {
    const seller = await prisma.seller.findUnique({ where: { id: p.sellerId } });
    if (!seller || !seller.approved) return NextResponse.json({ status: 'error', message: 'Selected seller is not approved.' }, { status: 400 });
    sellerId = seller.id;
  }
  const id = await uniqueId(slugify(p.name));
  const product = await prisma.product.create({ data: { id, source: p.source, sourceProductId: id, name: p.name, description: p.description, network: p.network || null, category: p.category, basePrice: p.basePrice, images: p.images, inStock: p.stock, sellerId, updatedAt: new Date() } });
  return NextResponse.json({ status: 'success', data: { id: product.id, name: product.name, basePrice: Number(product.basePrice), source: product.source } }, { status: 201 });
}
