'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type SellerData = {
  seller: { id: string; storeName: string; storeSlug: string; approved: boolean; earningsBalance: number; payoutName: string | null; payoutMomo: string | null; payoutNetwork: string | null; commissionPct: number };
  payouts: { id: string; amount: number; status: string; requestedAt: string; paidAt: string | null }[];
  orderQueue: { id: string; createdAt: string; customerPhone: string; status: string; total: number; deliveryMethod: string | null; items: { name: string; qty: number; fulfillment: string; unitPrice: number }[] }[];
};

export default function SellerPage() {
  const [data, setData] = useState<SellerData | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [authError, setAuthError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // apply form
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  // payout form
  const [pName, setPName] = useState('');
  const [pMomo, setPMomo] = useState('');
  const [pNet, setPNet] = useState('MTN');

  const load = () => fetch('/api/sellers/me').then(r => { if (r.status === 401) { setAuthError('Please sign in with your seller account.'); return null; } if (r.status === 404) { setNoProfile(true); return null; } return r.json(); }).then(r => { if (r?.status === 'success') setData(r.data); else if (r) setError(r.message ?? 'Could not load seller data.'); }).catch(() => setError('Could not load seller data.'));
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 5000); };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/sellers/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeName, storeSlug }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Application submitted! An admin will review it. Your account becomes a SELLER account once approved.');
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not apply.', true); }
    finally { setBusy(false); }
  };

  const savePayout = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/sellers/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutName: pName, payoutMomo: pMomo, payoutNetwork: pNet }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not save.', true); }
    finally { setBusy(false); }
  };

  const requestPayout = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/sellers/me/payouts', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not request payout.', true); }
    finally { setBusy(false); }
  };

  return <main className="productAdmin">
    <header><div><p>SELLER CENTER</p><h1>{data ? data.seller.storeName : 'Become a DigiMart seller'}</h1></div><Link href="/" className="btnLike">← Store</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    {authError && <p className="adminNotice err">{authError} <Link href="/sign-in?next=/seller">Sign in</Link></p>}
    {noProfile && <section className="catalogTable"><h2 style={{ marginTop: 0 }}>Apply to sell on DigiMart</h2>
      <p className="adminEmpty">Admin lists products and assigns them to your store. You deliver, track your order queue, and receive earnings to your Mobile Money account (minus platform commission).</p>
      <form onSubmit={apply} className="productForm">
        <label>Store name<input value={storeName} onChange={e => setStoreName(e.target.value)} required placeholder="DigiTech Accra" /></label>
        <label>Store URL slug<input value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required placeholder="digitech-accra" /></label>
        <button className="fieldFull" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
      </form>
    </section>}
    {data && <>
      <section className="catalogStats">
        <article><b>{data.seller.approved ? 'Approved ✓' : 'Under review'}</b><span>Store status · /store/{data.seller.storeSlug}</span></article>
        <article><b>GH₵{data.seller.earningsBalance.toFixed(2)}</b><span>Earnings balance (after {data.seller.commissionPct}% commission)</span></article>
        <article><b>{data.payouts.length}</b><span>Payout requests</span></article>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Payout account — where your money goes</h2>
        <form onSubmit={savePayout} className="productForm">
          <label>Account / MOMO name<input value={pName} onChange={e => setPName(e.target.value)} required placeholder={data.seller.payoutName ?? 'e.g. Kwame Mensah'} /></label>
          <label>Mobile Money number<input value={pMomo} onChange={e => setPMomo(e.target.value.replace(/\D/g, '').slice(0, 10))} required inputMode="numeric" placeholder={data.seller.payoutMomo ?? '055 123 4567'} /></label>
          <label>Network<select value={pNet} onChange={e => setPNet(e.target.value)}>{['MTN', 'Telecel', 'AirtelTigo'].map(n => <option key={n}>{n}</option>)}</select></label>
          <button disabled={busy}>{busy ? 'Saving…' : 'Save payout account'}</button>
        </form>
        {data.seller.payoutMomo && <p className="adminEmpty">Current: <b>{data.seller.payoutName}</b> · {data.seller.payoutMomo} ({data.seller.payoutNetwork}) — <button onClick={requestPayout} disabled={busy || data.seller.earningsBalance < 5}>Request payout (min GH₵5)</button></p>}
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Order queue</h2>
        {data.orderQueue.length === 0 ? <p className="adminEmpty">No orders for your products yet. When admin assigns products to your store, orders appear here.</p> : data.orderQueue.map(o => <div className="orderRow" key={o.id} style={{ gridTemplateColumns: 'minmax(130px,1.3fr) minmax(90px,1fr) auto auto' }}>
          <div><b>{o.id}</b><small>{o.items.map(i => `${i.name} ×${i.qty}`).join(', ')} · {o.deliveryMethod?.toLowerCase() ?? 'digital'}</small></div>
          <span>{o.customerPhone}</span>
          <strong>GH₵{o.total.toFixed(2)}</strong>
          <em className={`badge ${o.status.toLowerCase()}`}>{o.status}</em>
        </div>)}
      </section>
    </>}
  </main>;
}
