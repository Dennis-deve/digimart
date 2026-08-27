import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import BuyPanel from './buy-panel';
import ReviewPanel from './review-panel';

export const dynamic = 'force-dynamic';

const providerName = (source: string) => source === 'BUNDLESHOPGH' ? 'BundleShopGH' : source === 'MUVIIN' ? 'Muviin' : source === 'REFER2BUNDLE' ? 'Refer2Bundle' : 'DigiMart';
const iconFor = (category: string, name: string): string => {
  const c = `${category} ${name}`.toLowerCase();
  if (/afa|registration/.test(c)) return '🪪';
  if (/data bundle/.test(c)) return '📶';
  if (/airtime/.test(c)) return '📞';
  if (/stream|netflix|spotify|subscription/.test(c)) return '▶';
  if (/result|checker|bece|wassce|education/.test(c)) return '🎓';
  if (/electronic|tech|charger|power|phone|earbud/.test(c)) return '🎧';
  if (/grocer|rice|food/.test(c)) return '🛒';
  if (/service|repair/.test(c)) return '🧰';
  if (/bill|utility|electric/.test(c)) return '⚡';
  return '🛍️';
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { id: slug } });
  if (!product) return { title: 'Product not found | DigiMart' };
  return {
    title: `${product.name} — GH₵${Number(product.basePrice).toFixed(2)} | DigiMart Ghana`,
    description: product.description ?? `Buy ${product.name} on DigiMart — One Marketplace. Every Need. Pay with MTN, Telecel or AirtelTigo Mobile Money.`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: { title: `${product.name} | DigiMart`, description: product.description ?? `Buy ${product.name} on DigiMart Ghana`, type: 'website', siteName: 'DigiMart' },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ store?: string }> }) {
  const { slug } = await params;
  const { store: resellerSlug } = await searchParams;
  const product = await prisma.product.findUnique({ where: { id: slug } });
  const reviews = await prisma.review.findMany({ where: { productId: slug }, take: 200 });

  if (!product || !product.inStock || product.isExcluded) {
    return <main className="productPage">
      <header><Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link><Link href="/">← Back to marketplace</Link></header>
      <section className="productDetail"><article>
        <p className="eyebrow">NOT FOUND</p>
        <h1>This product is no longer available.</h1>
        <p className="description">It may have been removed from the DigiMart catalog. Browse the marketplace for data bundles, airtime, subscriptions, electronics and more.</p>
        <div className="recipient"><Link className="btnLike" href="/">Browse marketplace →</Link></div>
      </article></section>
    </main>;
  }

  const kindLabel = product.source === 'ADMIN' ? (product.category === 'Services' ? 'SERVICE BOOKING' : 'PHYSICAL PRODUCT') : 'DIGITAL DELIVERY';
  const provider = providerName(product.source);
  const icon = iconFor(product.category, product.name);
  const details = product.source === 'BUNDLESHOPGH' || product.source === 'REFER2BUNDLE'
    ? ['Recipient number is the Mobile Money number used at checkout', 'Non-expiry bundle', 'Current fulfilment estimate: 5–10 minutes']
    : product.source === 'MUVIIN'
      ? ['Delivered after payment is server-side verified', 'Track progress any time under Orders', 'Support is available daily']
      : ['Delivered through DigiMart delivery zones', 'Delivery fee confirmed at checkout', 'Track your delivery live'];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name, description: product.description ?? `${product.name} on DigiMart Ghana`,
    brand: { '@type': 'Brand', name: 'DigiMart' },
    ...(reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: reviews.length } } : {}),
    offers: { '@type': 'Offer', priceCurrency: 'GHS', price: Number(product.basePrice).toFixed(2), availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@type': 'Organization', name: `DigiMart via ${provider}` } },
  };

  return <main className="productPage">
    <header><Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link><Link href="/">← Back to marketplace</Link></header>
    <section className="productDetail">
      <div className="productVisual"><span>{icon}</span><i>Verified provider</i></div>
      <article>
        <p className="eyebrow">{kindLabel}</p>
        <h1>{product.name}</h1>
        <div className="provider">Sold through <b>{provider}</b> <span>✓ Verified</span></div>
        <h2>GH₵{Number(product.basePrice).toFixed(2)}</h2>
        <p className="description">{product.description ?? 'Fulfilled through DigiMart after payment is verified.'}</p>
        <div className="fulfilment"><b>How this order works</b><ol>{details.map(d => <li key={d}>{d}</li>)}</ol></div>
        <BuyPanel productId={product.id} digital={product.source !== 'ADMIN'} resellerSlug={resellerSlug} service={product.category === 'AFA Registration' ? 'afa' : product.category === 'AFA Registration (No ID)' ? 'afa-noid' : undefined} />
        <small>Secure payment is requested through Moolre. Fulfilment starts only after payment verification. A small Mobile Money processing fee is added at checkout.</small>
      </article>
    </section>
    <ReviewPanel productId={product.id} />
    <section className="trustRow"><div>🔒 <b>Secure payment</b><span>Moolre-verified checkout</span></div><div>◴ <b>Order tracking</b><span>Live order status updates</span></div><div>◉ <b>Need help?</b><span>Support is available daily</span></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  </main>;
}
