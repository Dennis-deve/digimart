import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Printable QR poster for a store. Open → Ctrl/Cmd+P → print or save as PDF. */
export default async function Poster({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const reseller = await prisma.reseller.findUnique({ where: { storeSlug: slug } });
  const seller = reseller ? null : await prisma.seller.findUnique({ where: { storeSlug: slug } });
  const store = reseller?.status === 'APPROVED' ? { name: reseller.storeName, tagline: reseller.storeTagline ?? 'One Marketplace. Every Need.', color: reseller.storeColor ?? '#ffd52b' }
    : seller?.approved ? { name: seller.storeName, tagline: 'Seller store — direct from the owner', color: '#ffd52b' } : null;
  if (!store) return <main style={{ padding: 40, fontFamily: 'Arial' }}><h1>Store not found</h1><Link href="/">← Home</Link></main>;
  return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f6f8fc', padding: 20 }}>
    <div style={{ width: 640, maxWidth: '100%', background: '#071c42', borderRadius: 28, padding: '48px 40px', textAlign: 'center', color: '#fff', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2, marginBottom: 4 }}><span style={{ color: '#fff' }}>Digi</span><span style={{ color: '#ffd52b' }}>Mart</span></div>
      <div style={{ fontSize: 11, letterSpacing: 3, color: '#9fb4dd', marginBottom: 26 }}>ONE MARKETPLACE. EVERY NEED.</div>
      <div style={{ background: '#fff', borderRadius: 22, padding: 22, display: 'inline-block', marginBottom: 22 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${slug}`} alt={`QR code for /store/${slug}`} width={320} height={320} style={{ display: 'block' }} />
      </div>
      <h1 style={{ margin: '0 0 6px', fontSize: 34, letterSpacing: -1 }}>{store.name}</h1>
      <p style={{ margin: '0 0 18px', color: '#c9d6ef', fontSize: 16 }}>{store.tagline}</p>
      <div style={{ background: store.color, color: '#071c42', display: 'inline-block', padding: '12px 26px', borderRadius: 999, fontWeight: 900, fontSize: 16 }}>SCAN TO SHOP → digimart.gh/store/{slug}</div>
      <p style={{ marginTop: 26, fontSize: 12, color: '#9fb4dd' }}>Pay with Mobile Money · Delivery &amp; pickup · Powered by Destech Solutions — 0544216532</p>
    </div>
    <p style={{ marginTop: 14, color: '#68758a', fontSize: 13 }}>Print: press <b>Ctrl/Cmd + P</b> → save as PDF or print.</p>
  </main>;
}
