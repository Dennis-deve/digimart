import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {validateProductRules} from '@/lib/product-rules';

const SELLER_CATEGORIES = ['Electronics', 'Groceries', 'Fashion', 'Home & Essentials', 'Beauty & Personal Care', 'Services', 'Other'];
const schema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  description: z.string().max(3000).optional(),
  price: z.number().positive(),
  image: z.string().url().max(600).optional(),
  onPlatform: z.boolean().default(false),
  variants: z.array(z.string().min(1).max(40)).max(12).optional(),
});

/** Seller uploads a product to their OWN store. It appears nowhere until admin approval. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'SELLER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (!seller) return NextResponse.json({ status: 'error', message: 'Apply as a seller first (Seller page).' }, { status: 404 });
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ status: 'error', message: input.error.issues[0]?.message ?? 'Invalid product.' }, { status: 400 });
  if (!SELLER_CATEGORIES.includes(input.data.category)) return NextResponse.json({ status: 'error', message: `Seller categories: ${SELLER_CATEGORIES.join(', ')}.` }, { status: 400 });
  const id = `sl-${seller.storeSlug}-${input.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
  const product = await prisma.product.create({ data: {
    id, source: 'ADMIN', sourceProductId: id, name: input.data.name, category: input.data.category,
    description: input.data.description, basePrice: input.data.price, images: input.data.image ? [input.data.image] : [],
    inStock: true, sellerId: seller.id, approvalStatus: 'PENDING', onPlatform: input.data.onPlatform, variants: input.data.variants && input.data.variants.length ? input.data.variants : undefined, updatedAt: new Date(),
  } });
  return NextResponse.json({ status: 'success', data: { id: product.id, approvalStatus: product.approvalStatus, message: 'Uploaded! An admin will review it — you will be notified when it goes live in your store.' } }, { status: 201 });
}

/** Seller's own inventory, including pending/rejected items. */
export async function GET(request: Request) {
  const guard = await requireRole(request, ['CUSTOMER', 'SELLER']);
  if (guard.response) return guard.response;
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  if (!seller) return NextResponse.json({ status: 'success', data: { storeSlug: seller === null ? null : undefined, products: [] } });
  const products = await prisma.product.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ status: 'success', data: { storeSlug: seller.storeSlug, approved: seller.approved, products: products.map(p => ({ id: p.id, name: p.name, category: p.category, price: Number(p.basePrice), approvalStatus: p.approvalStatus, onPlatform: p.onPlatform, inStock: p.inStock, image: p.images[0] ?? null })) } });
}
