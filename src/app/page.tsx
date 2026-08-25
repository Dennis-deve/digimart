'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = { id: number; icon: string; name: string; provider: string; price: number; type: 'digital' | 'physical' | 'service'; meta: string; badge?: string };

const products: Product[] = [
  { id: 1, icon: '📶', name: 'MTN 10GB Data Bundle', provider: 'BundleShopGH', price: 43, type: 'digital', meta: 'Non-expiry • estimated 5–10 mins', badge: 'Top pick' },
  { id: 2, icon: '▶', name: 'Netflix Premium', provider: 'Muviin', price: 55, type: 'digital', meta: 'Subscription package', badge: 'Popular' },
  { id: 3, icon: '🎧', name: 'Oraimo Wireless Earbuds', provider: 'DigiTech Kumasi', price: 180, type: 'physical', meta: 'Delivery today • In stock' },
  { id: 4, icon: '⚡', name: 'Electricity Credit', provider: 'Verified utility service', price: 10, type: 'digital', meta: 'Enter your meter number' },
];

export default function Home() {
  const [cart, setCart] = useState<Product[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'MTN'|'Telecel'|'AirtelTigo'>('MTN');
  const [processing, setProcessing] = useState(false);
  const [orderNotice, setOrderNotice] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [trackId, setTrackId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackResult, setTrackResult] = useState('');
  const [announcement, setAnnouncement] = useState('Orders are monitored in real time. Confirm delivery timing before payment.');
  // Loading browser-persisted cart state is intentionally performed once after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const stored = localStorage.getItem('digimart_cart'); if (stored) { try { setCart(JSON.parse(stored)); } catch {} } setCartReady(true); }, []);
  useEffect(() => { if (cartReady) localStorage.setItem('digimart_cart', JSON.stringify(cart)); }, [cart, cartReady]);
  useEffect(() => { fetch('/api/announcement').then(r=>r.json()).then(r=>{if(r.data?.isActive)setAnnouncement(r.data.message)}).catch(()=>undefined); }, []);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const removeItem = (index: number) => setCart(cart.filter((_, i) => i !== index));
  const message = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3000); };
  const add = (product: Product, direct = false) => {
    setCart(direct ? [product] : [...cart, product]);
    if (direct) setCheckoutOpen(true);
    message(direct ? 'Digital package selected — continue securely to payment.' : `${product.name} added to your cart.`);
  };
  const trackOrder = async () => {
    if (!trackId || !/^0\d{9}$/.test(trackPhone)) return message('Enter your DigiMart order number and matching phone number.');
    try { const response = await fetch(`/api/orders/${encodeURIComponent(trackId)}/track?phone=${trackPhone}`); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Order not found.'); setTrackResult(`${result.data.status.replaceAll('_',' ')} — ${result.data.timeline.at(-1)?.detail ?? ''}`); } catch (error) { setTrackResult(error instanceof Error ? error.message : 'Could not track this order.'); }
  };

  const checkout = async () => {
    if (!cart.length) return message('Add an item before continuing to checkout.');
    if (!/^0\d{9}$/.test(phone)) return message('Enter a valid 10-digit Ghana Mobile Money number.');
    setProcessing(true); setOrderNotice('');
    try {
      const response = await fetch('/api/orders/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ customerPhone:phone, provider:network, items:cart.map(p=>({productId:p.id === 1 ? 'bs-mtn-10gb' : p.id === 2 ? 'mu-netflix-premium' : p.id === 4 ? 'mu-airtime-10' : 'admin-earbuds',qty:1,metadata:{}})), couponCode: couponCode || undefined, idempotencyKey:crypto.randomUUID() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Checkout could not start.');
      setOrderNotice(`Order ${result.data.orderId}: subtotal GH₵${result.data.subtotal.toFixed(2)}, discount GH₵${result.data.discount.toFixed(2)}, final total GH₵${result.data.total.toFixed(2)}. ${result.data.instructions}`);
    } catch (error) { message(error instanceof Error ? error.message : 'Checkout could not start.'); }
    finally { setProcessing(false); }
  };

  return <main>
    <div className="notice"><span>●</span> {announcement}</div>
    <header className="topbar">
      <div className="logo"><span>Digi</span><b>Mart</b></div>
      <div className="deliver">Delivering to <strong>Kumasi, Ghana</strong>⌄</div>
      <label className="search">⌕ <input placeholder="Search products, services and stores" /></label>
      <button className="bell" aria-label="Notifications">♧</button>
      <button className="cartButton" onClick={() => setCheckoutOpen(true)} aria-label="Cart">🛒 <em>{cart.length}</em></button>
    </header>

    <section className="hero">
      <div className="heroCopy"><p>ONE MARKETPLACE. EVERY NEED.</p><h1>Shop data, essentials and more.</h1><h2>Trusted digital services, local sellers and reseller stores—one easy checkout.</h2><button onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Explore DigiMart <span>→</span></button></div>
      <div className="heroArt"><div className="orb one"/><div className="orb two"/><div className="heroCard">🛍️<small>Everything, one place</small></div></div>
    </section>

    <section className="content"><div className="sectionHead"><h2>Quick actions</h2></div><div className="quickActions">
      <button onClick={() => document.getElementById('shop')?.scrollIntoView({behavior:'smooth'})}>📶 <span>Buy Data</span></button><button onClick={() => message('Bill payments use approved utility providers.')}>⚡ <span>Pay a Bill</span></button><button onClick={() => setCheckoutOpen(true)}>🧾 <span>View Cart</span></button><button onClick={() => message('Reseller applications include payment and approval stages.')}>🏪 <span>Become a Reseller</span></button>
    </div>
    <div className="sectionHead"><h2>Shop by category</h2><button>See all</button></div><div className="categories">
      {['📶 Data & Airtime','🛒 Groceries','💻 Electronics','⚡ Bills','🎓 Education','🧰 Services'].map(c => <button key={c}><span>{c.split(' ')[0]}</span>{c.substring(c.indexOf(' ') + 1)}</button>)}
    </div>
    <div className="sectionHead" id="shop"><div><h2>Popular in Kumasi</h2><p>Trusted providers and DigiMart sellers</p></div><button>View all</button></div>
    <div className="productGrid">{products.map(product => <article className="product" key={product.id}>
      {product.badge && <span className="badge">{product.badge}</span>}<div className="productArt">{product.icon}</div><h3>{product.name}</h3><p>{product.provider}</p><strong>GH₵{product.price.toFixed(2)}</strong><small><i/> {product.meta}</small>
      <button onClick={() => add(product, product.type === 'digital')}>{product.type === 'digital' ? 'Buy now' : 'Add to cart'}</button>
    </article>)}</div>
    <div className="sectionHead"><h2>Featured reseller store</h2><button>Explore stores</button></div>
    <article className="store"><div className="storeCover"/><div className="storeInfo"><div className="storeLogo">JD</div><div><h3>Joedai Store <span>✓ Verified</span></h3><p>Affordable data, devices and essentials</p></div><button onClick={() => message('Joedai Store storefront selected.')}>Visit store →</button></div></article>
    <section className="tracking"><p>KNOW WHAT IS HAPPENING</p><h2>Track any DigiMart order</h2><span>Use an order number and the phone number used at checkout.</span><div className="trackForm"><input value={trackId} onChange={e => setTrackId(e.target.value.toUpperCase())} placeholder="Order number e.g. DM-48291"/><input value={trackPhone} onChange={e => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0,10))} inputMode="numeric" placeholder="Phone number"/><button onClick={trackOrder}>Track order</button></div>{trackResult && <p className="trackResult">{trackResult}</p>}</section>
    </section>

    <nav className="mobileNav"><button>⌂<span>Home</span></button><button>▦<span>Categories</span></button><button onClick={() => setCheckoutOpen(true)}>🛒<span>Cart</span></button><button>◴<span>Orders</span></button><button>◉<span>Account</span></button></nav>
    {checkoutOpen && <div className="overlay" onClick={() => setCheckoutOpen(false)}><section className="checkout" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setCheckoutOpen(false)}>×</button><p className="eyebrow">DIGIMART CHECKOUT</p><h2>Secure checkout</h2><p className="sub">Digital orders begin only after payment is server-side verified.</p><div className="items">{cart.length ? cart.map((p, i) => <div className="line" key={`${p.id}-${i}`}><span>{p.icon} {p.name}</span><b>GH₵{p.price.toFixed(2)} <button className="removeItem" onClick={() => removeItem(i)}>×</button></b></div>) : <p>Your cart is empty.</p>}</div><div className="line total"><span>Total</span><b>GH₵{total.toFixed(2)}</b></div><input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code (optional)"/><input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} inputMode="numeric" placeholder="Mobile Money number e.g. 055 123 4567"/><div className="networkSelect">{(['MTN','Telecel','AirtelTigo'] as const).map(n => <button type="button" key={n} className={network === n ? 'selected' : ''} onClick={() => setNetwork(n)}>{n}</button>)}</div>{orderNotice && <p className="orderNotice">{orderNotice}</p>}<button className="payment" disabled={processing} onClick={checkout}>{processing ? 'Starting secure payment…' : 'Continue to secure payment'}</button><small>Payment is verified by DigiMart before a provider, seller or rider starts fulfilment.</small></section></div>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}
