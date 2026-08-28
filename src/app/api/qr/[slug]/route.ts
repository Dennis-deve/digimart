import { siteUrl } from '@/lib/site-url';

export const runtime = 'nodejs';

/** QR code PNG for a store link — /api/qr/{storeSlug} */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = `${siteUrl()}/store/${slug.replace(/[^a-z0-9-]/gi, '')}`;
  const QRCode = (await import('qrcode')).default;
  const png = await QRCode.toBuffer(url, { width: 600, margin: 2, color: { dark: '#071c42', light: '#ffffff' } });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
