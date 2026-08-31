import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const iconFor = (category: string, name: string): string => {
  const c = `${category} ${name}`.toLowerCase();
  if (/data bundle/.test(c)) return '📶';
  if (/airtime/.test(c)) return '📞';
  if (/stream|netflix|spotify|subscription/.test(c)) return '▶';
  if (/result|checker|bece|wassce/.test(c)) return '🎓';
  if (/electronic|tech|charger|power|phone|earbud/.test(c)) return '🎧';
  if (/grocer|rice|food/.test(c)) return '🛒';
  if (/service|repair/.test(c)) return '🧰';
  return '🛍️';
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.reseller.findUnique({ where: { storeSlug: slug } });
  return { title: store ? `${store.storeName} — DigiMart reseller store` : 'Store not found | DigiMart', description: store?.storeTagline ?? `Shop from ${store?.storeName ?? 'this DigiMart store'}` };
}

export default async function Store({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await prisma.storeStat.create({ data: { id: crypto.randomUUID(), slug } }).catch(() => undefined);
  const reseller = await prisma.reseller.findUnique({ where: { storeSlug: slug }, include: { User: { select: { phone: true } } } });
  if (!reseller || reseller.status !== 'APPROVED') {
    const seller = await prisma.seller.findUnique({ where: { storeSlug: slug }, include: { User: { select: { phone: true } } } });
    if (!seller || !seller.approved) {
      return <main className="faqSection" style={{ maxWidth: 800, margin: '30px auto' }}>
        <h1>Store not found</h1>
        <p style={{ color: '#4c5a72' }}>This store does not exist or is not currently approved on DigiMart.</p>
        <p><Link className="btnLike" href="/">Browse the marketplace →</Link></p>
      </main>;
    }
    const own = await prisma.product.findMany({ where: { sellerId: seller.id, approvalStatus: 'APPROVED', inStock: true, isExcluded: false }, orderBy: { createdAt: 'desc' } });
    const initials = seller.storeName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return <main className="publicStore">
      <header><Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link><Link href="/">← All of DigiMart</Link></header>
      <section className="dmStoreHero" style={seller.storeBanner ? { backgroundImage: `linear-gradient(100deg,#071c42cc,#071c4299),url(${seller.storeBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(120deg,#071c42,#123a8f)' }}>
        <div className="dmStoreAvatar">{initials}</div>
        <div><p>VERIFIED DIGIMART SELLER STORE</p><h1>{seller.storeName}</h1><span>Direct from the owner — seller-set prices, DigiMart-secured payment &amp; delivery.</span></div>
      </section>
      <section className="dmStoreBody">
        <h2>Products in this store</h2>
        <p className="dmStoreNote">Payment and fulfilment are handled securely by DigiMart.</p>
        {own.length === 0 ? <p className="dmStoreNote">This store has no products yet — check back soon.</p> :
          <div className="productGrid">{own.map(p => <article className="product" key={p.id}>
            <div className="productArt">{iconFor(p.category, p.name)}</div>
            <h3><Link href={`/product/${p.id}?seller=${seller.storeSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link></h3>
            <p>{p.category}</p><strong>GH₵{Number(p.basePrice).toFixed(2)}</strong>
            <small>Physical delivery</small>
            <Link href={`/product/${p.id}?seller=${seller.storeSlug}`} className="btnLike" style={{ textAlign: 'center' }}>Buy from this store</Link>
          </article>)}</div>}
      </section>
      <footer className="dmStoreFooter">Store link: <b>/store/{seller.storeSlug}</b> · <a href={`/store/${seller.storeSlug}/poster`} target="_blank" rel="noreferrer">🖨 QR poster</a> — share it anywhere. Questions? <Link href="/support">Contact DigiMart support</Link>.</footer>
    </main>;
  }
  if (false) {
    return <main className="faqSection" style={{ maxWidth: 800, margin: '30px auto' }}>
      <h1>Store not found</h1>
      <p style={{ color: '#4c5a72' }}>This store does not exist or is not currently approved on DigiMart.</p>
      <p><Link className="btnLike" href="/">Browse the marketplace →</Link></p>
    </main>;
  }
  const products = await prisma.product.findMany({ where: { inStock: true, isExcluded: false }, orderBy: { createdAt: 'desc' } });
  const markups = await prisma.resellerProductMarkup.findMany({ where: { resellerId: reseller.id } });
  const markupByProduct = new Map(markups.map(m => [m.productId, Number(m.markupPct)]));
  const defaultMarkup = Number(reseller.defaultMarkupPct);
  const price = (id: string, base: number) => Math.round(base * (1 + (markupByProduct.get(id) ?? defaultMarkup) / 100) * 100) / 100;
  const accent = /^#[0-9a-fA-F]{6}$/.test(reseller.storeColor ?? '') ? reseller.storeColor! : '#071c42';
  const initials = reseller.storeName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return <main className="publicStore">
    <header><Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link><Link href="/">← All of DigiMart</Link></header>
    <section className="dmStoreHero" style={reseller.storeBanner ? { backgroundImage: `linear-gradient(100deg,#071c42cc,#071c4299),url(${reseller.storeBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(120deg, ${accent}, #071c42 70%)` }}>
      <div className="dmStoreAvatar">{initials}</div>
      <div>
        <p>VERIFIED DIGIMART RESELLER STORE</p>
        <h1>{reseller.storeName}</h1>
        <span>{reseller.storeTagline ?? 'Trusted essentials at store prices — fulfilled by DigiMart.'}</span>
      </div>
    </section>
    <section className="dmStoreBody">
      <h2>Products in this store</h2>
      <p className="dmStoreNote">Prices include this store&apos;s markup. Payment and fulfilment are handled securely by DigiMart.</p>
      {products.length === 0 ? <p className="dmStoreNote">This store has no products listed yet — check back soon.</p> :
        <div className="productGrid">{products.map(p => <article className="product" key={p.id}>
          <div className="productArt">{iconFor(p.category, p.name)}</div>
          <h3><Link href={`/product/${p.id}?store=${reseller.storeSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link></h3>
          <p>{p.category}</p>
          <strong>GH₵{price(p.id, Number(p.basePrice)).toFixed(2)}</strong>
          <small>{p.source === 'BUNDLESHOPGH' || p.source === 'REFER2BUNDLE' ? 'Instant data delivery' : p.source === 'MUVIIN' ? 'Digital delivery' : 'Physical delivery'}</small>
          <Link href={`/product/${p.id}?store=${reseller.storeSlug}`} className="btnLike" style={{ textAlign: 'center' }}>Buy from this store</Link>
        </article>)}</div>}
    </section>
    <footer className="dmStoreFooter">Store link: <b>/store/{reseller.storeSlug}</b> · <a href={`/store/${reseller.storeSlug}/poster`} target="_blank" rel="noreferrer">🖨 QR poster</a> — share it anywhere. Questions? <Link href="/support">Contact DigiMart support</Link>.</footer>
  </main>;
}
