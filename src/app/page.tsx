'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type ApiProduct = { id: string; name: string; network: string | null; category: string; basePrice: number; variablePrice: boolean; minAmount: number | null; maxAmount: number | null; images: string[]; description: string | null; inStock: boolean; provider: 'BUNDLESHOPGH' | 'MUVIIN' | 'ADMIN' | 'REFER2BUNDLE'; externalCheckout?: boolean; externalUrl?: string | null };
type Product = { id: string; icon: string; name: string; provider: string; price: number; type: 'digital' | 'physical' | 'service'; meta: string; category: string; qty?: number; externalUrl?: string | null };
type Zone = { id: string; name: string; city: string; baseFee: number; minimumOrder: number | null; estimatedMinutes: number; pickupAvailable: boolean; active: boolean };
type Address = { id: string; label: string; recipientName: string; phone: string; address: string; city: string };
type StoreCard = { name: string; slug: string; tagline: string | null; color: string; since: string | null };

const providerName = (source: ApiProduct['provider']) => source === 'BUNDLESHOPGH' ? 'BundleShopGH' : source === 'MUVIIN' ? 'Muviin' : source === 'REFER2BUNDLE' ? 'Refer2Bundle' : 'DigiMart';
const kindOf = (p: ApiProduct): Product['type'] => p.provider === 'ADMIN' ? (p.category === 'Services' ? 'service' : 'physical') : 'digital';
const iconFor = (p: ApiProduct): string => {
  const c = `${p.category} ${p.name}`.toLowerCase();
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
const metaFor = (p: ApiProduct): string => {
  const kind = kindOf(p);
  if (kind === 'digital') return /afa/i.test(p.category) ? 'Processed after verified payment' : 'Delivered after verified payment';
  if (kind === 'service') return 'Scheduled service';
  return 'Physical delivery';
};
const round2 = (n: number) => Math.round(n * 100) / 100;

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
  const [user, setUser] = useState<{ id: string; phone: string; role: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentFeePct, setPaymentFeePct] = useState(1.95);
  const [stores, setStores] = useState<StoreCard[]>([]);
  // search + filter
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');
  const [searching, setSearching] = useState(false);
  // delivery state
  const [method, setMethod] = useState<'DELIVERY'|'PICKUP'>('DELIVERY');
  const [zoneId, setZoneId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrText, setAddrText] = useState('');
  const [addrCity, setAddrCity] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const stored = localStorage.getItem('digimart_cart'); if (stored) { try { const parsed = JSON.parse(stored); if (Array.isArray(parsed)) setCart(parsed.filter((x): x is Product => !!x && typeof x.id === 'string' && typeof x.price === 'number')); } catch {} } setCartReady(true); }, []);
  useEffect(() => { if (cartReady) localStorage.setItem('digimart_cart', JSON.stringify(cart)); }, [cart, cartReady]);
  useEffect(() => { fetch('/api/announcement').then(r=>r.json()).then(r=>{if(r.data?.isActive)setAnnouncement(r.data.message)}).catch(()=>undefined); }, []);
  useEffect(() => { fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(r => { if (r?.data) setUser(r.data); }).catch(() => undefined); }, []);
  useEffect(() => { fetch('/api/delivery-zones').then(r=>r.json()).then(r=>{ if(Array.isArray(r.data)) { setZones(r.data); setZoneId(r.data[0]?.id ?? ''); } }).catch(()=>undefined); fetch('/api/config').then(r=>r.json()).then(r=>{ if(typeof r.data?.paymentFeePct==='number') setPaymentFeePct(r.data.paymentFeePct); }).catch(()=>undefined); fetch('/api/stores').then(r=>r.json()).then(r=>{ if(Array.isArray(r.data)) setStores(r.data); }).catch(()=>undefined); }, []);
  useEffect(() => { if (user) { fetch('/api/addresses').then(r => r.ok ? r.json() : null).then(r => { if (Array.isArray(r?.data)) { setAddresses(r.data); const def = r.data.find((a: Address) => (a as Address & { isDefault?: boolean }).isDefault) ?? r.data[0]; if (def) { setAddressId(def.id); setUseNewAddress(false); } } }).catch(()=>undefined); } }, [user]);

  // debounce search
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 350); return () => clearTimeout(t); }, [query]);
  // catalog fetch with search + category
  useEffect(() => { let active = true; setSearching(true);
    const params = new URLSearchParams(); if (debounced) params.set('q', debounced); if (category !== 'All') params.set('category', category);
    fetch(`/api/products${params.toString() ? `?${params}` : ''}`).then(r=>r.json()).then(r=>{ if(!active)return; if(Array.isArray(r.data)) setProducts(r.data.map((p: ApiProduct) => ({ id: p.id, icon: iconFor(p), name: p.name, provider: providerName(p.provider), price: p.basePrice, type: kindOf(p), meta: metaFor(p), category: p.category, externalUrl: p.externalUrl ?? null }))); }).catch(()=>undefined).finally(()=>{ if(active) setSearching(false); });
    return () => { active = false; };
  }, [debounced, category]);

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))].slice(0, 9), [products]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * (item.qty ?? 1), 0), [cart]);
  const hasPhysical = cart.some(item => item.type === 'physical');
  const zone = zones.find(z => z.id === zoneId);
  const deliveryFee = !hasPhysical ? 0 : method === 'PICKUP' ? 0 : zone ? (zone.minimumOrder !== null && subtotal >= zone.minimumOrder ? 0 : zone.baseFee) : 0;
  const paymentFee = round2((Math.max(0, subtotal) + deliveryFee) * paymentFeePct / 100);
  const total = round2(subtotal + deliveryFee + paymentFee);
  const removeItem = (index: number) => setCart(cart.filter((_, i) => i !== index));
  const changeQty = (index: number, delta: number) => setCart(cart.map((item, i) => i === index ? { ...item, qty: Math.min(10, Math.max(1, (item.qty ?? 1) + delta)) } : item));
  const message = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3000); };
  const add = (product: Product, direct = false) => {
    setCart(direct ? [{ ...product, qty: 1 }] : [...cart, { ...product, qty: 1 }]);
    if (direct) setCheckoutOpen(true);
    message(direct ? 'Digital package selected — continue securely to payment.' : `${product.name} added to your cart.`);
  };
  const trackOrder = async () => {
    if (!trackId || !/^0\d{9}$/.test(trackPhone)) return message('Enter your DigiMart order number and matching phone number.');
    try { const response = await fetch(`/api/orders/${encodeURIComponent(trackId)}/track?phone=${trackPhone}`); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Order not found.'); setTrackResult(`${result.data.status.replaceAll('_',' ')} — ${result.data.timeline.at(-1)?.detail ?? ''}`); } catch (error) { setTrackResult(error instanceof Error ? error.message : 'Could not track this order.'); }
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearch = () => { searchRef.current?.focus(); searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  const checkout = async () => {
    if (!cart.length) return message('Add an item before continuing to checkout.');
    if (!/^0\d{9}$/.test(phone)) return message('Enter a valid 10-digit Ghana Mobile Money number.');
    let deliveryAddress: { recipientName: string; phone: string; address: string; city: string } | undefined;
    if (hasPhysical && method === 'DELIVERY') {
      if (!zoneId) return message('Select a delivery zone.');
      if (!useNewAddress && addressId) { const a = addresses.find(x => x.id === addressId); if (a) deliveryAddress = { recipientName: a.recipientName, phone: a.phone, address: a.address, city: a.city }; }
      else {
        if (!/^0\d{9}$/.test(addrPhone)) return message('Enter a valid recipient phone number for delivery.');
        if (addrName.trim().length < 2 || addrText.trim().length < 4 || addrCity.trim().length < 2) return message('Complete the delivery address (name, address, city).');
        deliveryAddress = { recipientName: addrName.trim(), phone: addrPhone, address: addrText.trim(), city: addrCity.trim() };
      }
    }
    setProcessing(true); setOrderNotice('');
    try {
      const body: Record<string, unknown> = { customerPhone: phone, provider: network, items: cart.map(p=>({productId:p.id, qty:p.qty ?? 1, metadata:{}})), couponCode: couponCode || undefined, idempotencyKey: crypto.randomUUID() };
      if (hasPhysical) { body.deliveryMethod = method; body.deliveryZoneId = zoneId; if (method === 'DELIVERY' && !useNewAddress && addressId) body.deliveryAddressId = addressId; else if (method === 'DELIVERY' && deliveryAddress) body.deliveryAddress = deliveryAddress; }
      const response = await fetch('/api/orders/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Checkout could not start.');
      const d = result.data;
      setOrderNotice(`Order ${d.orderId}: subtotal GH₵${Number(d.subtotal).toFixed(2)}${d.discount ? `, discount −GH₵${Number(d.discount).toFixed(2)}` : ''}${d.deliveryFee ? `, delivery GH₵${Number(d.deliveryFee).toFixed(2)}` : ''}, MoMo fee GH₵${Number(d.paymentFee).toFixed(2)}, total GH₵${Number(d.total).toFixed(2)}. ${d.instructions}`);
    } catch (error) { message(error instanceof Error ? error.message : 'Checkout could not start.'); }
    finally { setProcessing(false); }
  };

  return <main>
    <div className="notice"><span>●</span> {announcement}</div>
    <header className="topbar">
      <Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link>
      <label className="search">⌕ <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search data, airtime, AFA, electronics…" /></label>
      <Link className="bell" href="/notifications" aria-label="Notifications">♧</Link>
      {user ? <Link className="signinButton" href="/account">◉</Link> : <Link className="signinButton" href="/sign-in">Sign in</Link>}
      <button className="cartButton" onClick={() => setCheckoutOpen(true)} aria-label="Cart">🛒 <em>{cart.length}</em></button>
    </header>

    <section className="hero">
      <div className="heroCopy"><p>ONE MARKETPLACE. EVERY NEED.</p><h1>Data, essentials &amp; more.</h1><h2>Trusted digital services, local sellers and reseller stores — one easy Mobile Money checkout.</h2>
      <div className="heroActions"><button onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}>Shop now <span>→</span></button><button className="ghost" onClick={focusSearch}>⌕ Search</button></div></div>
      <div className="heroArt"><div className="orb one"/><div className="orb two"/><div className="heroCard">🛍️<small>Everything, one place</small></div></div>
    </section>

    <section className="content">
    <div className="sectionHead" id="shop"><div><h2>{debounced || category !== 'All' ? 'Search results' : 'Browse the marketplace'}</h2><p>{searching ? 'Searching…' : `${products.length} product${products.length === 1 ? '' : 's'}${debounced ? ` for “${debounced}”` : ''}`}</p></div>{(debounced || category !== 'All') && <button onClick={() => { setQuery(''); setCategory('All'); }}>Clear ✕</button>}</div>
    <div className="chipRow">{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>

    <div className="productGrid">{products.length ? products.map(product => <article className="product" key={product.id}>
      <div className="productArt"><span>{product.icon}</span><i className="catTag">{product.category}</i></div><h3><Link href={`/product/${product.id}`}>{product.name}</Link></h3><p>✓ DigiMart verified</p><strong>GH₵{product.price.toFixed(2)}</strong><small><i/> {product.meta}</small>
      {product.externalUrl ? <a className="btnLike" style={{ textAlign: 'center', display: 'block' }} href={product.externalUrl} target="_blank" rel="noreferrer">Buy now ↗</a> : <button onClick={() => add(product, product.type === 'digital')}>{product.type === 'digital' ? 'Buy now' : 'Add to cart'}</button>}
    </article>) : !searching ? <p className="catalogEmpty">Nothing found{debounced ? ` for “${debounced}”` : ''}. Try another search or category.</p> : <p className="catalogEmpty">Searching…</p>}</div>

    {stores.length > 0 && <>
      <div className="sectionHead"><div><h2>Verified reseller stores</h2><p>Admin-approved DigiMart resellers</p></div></div>
      <div className="storeGridV2">{stores.map(s => <Link href={`/store/${s.slug}`} key={s.slug} className="storeCardV2" style={{ ['--accent' as string]: s.color }}>
        <div className="scAvatar">{s.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
        <b>{s.name}</b>
        <span>{s.tagline ?? 'Trusted essentials at store prices'}</span>
        <em>✓ Verified store →</em>
      </Link>)}</div>
    </>}

    <section className="tracking"><p>KNOW WHAT IS HAPPENING</p><h2>Track any DigiMart order</h2><span>Use an order number and the phone number used at checkout.</span><div className="trackForm"><input value={trackId} onChange={e => setTrackId(e.target.value.toUpperCase())} placeholder="Order number e.g. DM-48291"/><input value={trackPhone} onChange={e => setTrackPhone(e.target.value.replace(/\D/g, '').slice(0,10))} inputMode="numeric" placeholder="Phone number"/><button onClick={trackOrder}>Track order</button></div>{trackResult && <p className="trackResult">{trackResult}</p>}</section>
    <section className="faqSection"><h2>Frequently asked questions</h2>
      {[['How fast is data bundle delivery?','Most MTN, Telecel and AirtelTigo bundles arrive within minutes of verified payment. Fulfilment only starts after payment is server-side verified.'],['Who pays the Mobile Money fee?','The buyer pays a small MoMo processing fee at checkout, shown before you confirm — DigiMart does not deduct it from sellers or resellers.'],['How do I get my items?','Digital items are delivered to your phone instantly. Physical items are delivered by riders across our delivery zones, or you can pick up at selected zones.'],['How do I become a reseller?','Apply from the Become a Reseller page, pay the registration fee, and after admin approval you get your own store with custom markups.']].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
    </section>
    </section>

    <nav className="mobileNav"><Link href="/">⌂<span>Home</span></Link><button onClick={focusSearch}>⌕<span>Search</span></button><button onClick={() => setCheckoutOpen(true)}>🛒<span>Cart</span></button><Link href="/orders">◴<span>Orders</span></Link><Link href={user ? '/account' : '/sign-in'}>◉<span>Account</span></Link></nav>
    {checkoutOpen && <div className="overlay" onClick={() => setCheckoutOpen(false)}><section className="checkout" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setCheckoutOpen(false)}>×</button><p className="eyebrow">DIGIMART CHECKOUT</p><h2>Secure checkout</h2><p className="sub">Digital orders begin only after payment is server-side verified.</p><div className="items">{cart.length ? cart.map((p, i) => <div className="line" key={`${p.id}-${i}`}><span>{p.icon} {p.name}</span><b>GH₵{(p.price * (p.qty ?? 1)).toFixed(2)} <span className="qtyStepper"><button onClick={() => changeQty(i, -1)} aria-label="Decrease">−</button><em>{p.qty ?? 1}</em><button onClick={() => changeQty(i, 1)} aria-label="Increase">+</button></span><button className="removeItem" onClick={() => removeItem(i)}>×</button></b></div>) : <p>Your cart is empty.</p>}</div>
      {hasPhysical && <div className="deliveryBlock">
        <p className="eyebrow">PHYSICAL ITEMS — DELIVERY</p>
        <div className="methodChips"><button type="button" className={method === 'DELIVERY' ? 'selected' : ''} onClick={() => setMethod('DELIVERY')}>🚚 Delivery</button><button type="button" className={method === 'PICKUP' ? 'selected' : ''} onClick={() => setMethod('PICKUP')}>🏪 Pickup</button></div>
        {zones.length === 0 && <p className="deliveryHint">No delivery zones available yet — physical delivery is being set up.</p>}
        {zones.length > 0 && <>
        <label>Zone<select value={zoneId} onChange={e => setZoneId(e.target.value)}>{zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.city}) — {method === 'PICKUP' ? (z.pickupAvailable ? 'pickup available' : 'pickup unavailable') : `GH₵${z.baseFee.toFixed(2)} · ~${z.estimatedMinutes} min`}</option>)}</select></label>
        {method === 'DELIVERY' && (zone && <p className="deliveryHint">{zone.minimumOrder !== null && subtotal >= zone.minimumOrder ? `Free delivery (orders over GH₵${zone.minimumOrder.toFixed(2)})` : `Delivery fee GH₵${zone.baseFee.toFixed(2)} · estimated ${zone.estimatedMinutes} minutes`}</p>)}
        {method === 'PICKUP' && zone && !zone.pickupAvailable && <p className="deliveryHint">Pickup is not available in this zone — switch to Delivery.</p>}
        {method === 'DELIVERY' && <>
          {addresses.length > 0 && <div className="addressToggle"><button type="button" className={!useNewAddress ? 'selected' : ''} onClick={() => setUseNewAddress(false)}>Saved address</button><button type="button" className={useNewAddress ? 'selected' : ''} onClick={() => setUseNewAddress(true)}>New address</button></div>}
          {!useNewAddress && addresses.length > 0 ? <label>Saved address<select value={addressId} onChange={e => setAddressId(e.target.value)}>{addresses.map(a => <option key={a.id} value={a.id}>{a.label}: {a.recipientName}, {a.address}, {a.city}</option>)}</select></label>
          : <div className="addressForm">
            <input value={addrName} onChange={e => setAddrName(e.target.value)} placeholder="Recipient name"/>
            <input value={addrPhone} onChange={e => setAddrPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="Recipient phone"/>
            <input value={addrText} onChange={e => setAddrText(e.target.value)} placeholder="Street / landmark"/>
            <input value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder="City / town"/>
          </div>}
        </>}
        </>}
      </div>}
      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code (optional)"/>
      <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} inputMode="numeric" placeholder="Mobile Money number e.g. 055 123 4567"/>
      <div className="networkSelect">{(['MTN','Telecel','AirtelTigo'] as const).map(n => <button type="button" key={n} className={network === n ? 'selected' : ''} onClick={() => setNetwork(n)}>{n}</button>)}</div>
      <div className="feeSummary">
        <div><span>Subtotal</span><b>GH₵{subtotal.toFixed(2)}</b></div>
        {hasPhysical && <div><span>Delivery ({method === 'PICKUP' ? 'pickup' : 'rider'})</span><b>{deliveryFee === 0 ? 'Free' : `GH₵${deliveryFee.toFixed(2)}`}</b></div>}
        <div><span>MoMo fee ({paymentFeePct}% — paid by buyer)</span><b>GH₵{paymentFee.toFixed(2)}</b></div>
        <div className="total"><span>Total</span><b>GH₵{total.toFixed(2)}</b></div>
      </div>
      {orderNotice && <p className="orderNotice">{orderNotice}</p>}
      <button className="payment" disabled={processing} onClick={checkout}>{processing ? 'Starting secure payment…' : `Pay GH₵${total.toFixed(2)} securely`}</button>
      <small>Moolre will request this payment on your phone — approve it and enter your MoMo PIN to complete the order. Payment is server-verified before fulfilment starts.</small>
    </section></div>}
    {toast && <div className="toast">{toast}</div>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':'How fast is data bundle delivery in Ghana?','acceptedAnswer':{'@type':'Answer','text':'Most MTN, Telecel and AirtelTigo bundles from DigiMart arrive within minutes of verified Mobile Money payment.'}},{'@type':'Question','name':'Who pays the Mobile Money fee on DigiMart?','acceptedAnswer':{'@type':'Answer','text':'The buyer pays a small MoMo processing fee shown at checkout. DigiMart does not deduct it from sellers or resellers.'}}]})}} />
  </main>;
}
