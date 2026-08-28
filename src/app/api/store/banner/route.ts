import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
import {uploadImage} from '@/lib/cloudinary';

export const runtime = 'nodejs';

/** Store banner upload (Cloudinary) for the signed-in approved seller/reseller. */
export async function POST(request: Request) {
  const guard = await requireRole(request, ['SELLER', 'RESELLER']);
  if (guard.response) return guard.response;
  const data = await request.formData();
  const file = data.get('image');
  if (!(file instanceof File)) return NextResponse.json({ status: 'error', message: 'Image file required.' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ status: 'error', message: 'Only image uploads allowed.' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ status: 'error', message: 'Image must be 10MB or less.' }, { status: 400 });
  const seller = await prisma.seller.findUnique({ where: { userId: guard.session!.id } });
  const reseller = seller ? null : await prisma.reseller.findUnique({ where: { userId: guard.session!.id } });
  if (!(seller?.approved || reseller?.status === 'APPROVED')) return NextResponse.json({ status: 'error', message: 'Approved store required.' }, { status: 403 });
  try {
    const result = await uploadImage(Buffer.from(await file.arrayBuffer()), 'digimart/banners');
    const url = result.url;
    if (seller) await prisma.seller.update({ where: { id: seller.id }, data: { storeBanner: url } });
    else await prisma.reseller.update({ where: { id: reseller!.id }, data: { storeBanner: url } });
    return NextResponse.json({ status: 'success', data: { url } }, { status: 201 });
  } catch { return NextResponse.json({ status: 'error', message: 'Upload failed — check Cloudinary settings.' }, { status: 502 }); }
}
