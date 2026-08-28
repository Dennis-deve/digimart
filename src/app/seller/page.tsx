'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StoreGrowthPanel from '@/components/store-growth-panel';

type MyProduct = { id: string; name: string; category: string; price: number; approvalStatus: string; onPlatform: boolean; inStock: boolean; image: string | null };
type SellerData = { seller: { id: string; storeName: string; storeSlug: string; approved: boolean; registrationFee?: number; feePaid?: boolean; earningsBalance: number; payoutName: string | null; payoutMomo: string | null; payoutNetwork: string | null; commissionPct: number }; payouts: { id: string; amount: number; status: string; requestedAt: string; paidAt: string | null }[]; orderQueue: { id: string; createdAt: string; customerPhone: string; status: string; total: number; deliveryMethod: string | null; items: { name: string; qty: number; fulfillment: string; unitPrice: number }[] }[] };

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
  const [applyMomo, setApplyMomo] = useState('');
  // payout form
  const [pName, setPName] = useState('');
  const [pMomo, setPMomo] = useState('');
  const [pNet, setPNet] = useState('MTN');
  const [myProducts, setMyProducts] = useState<MyProduct[] | null>(null);
  const [feeInfo, setFeeInfo] = useState<{ registrationFee: number; feePaid: boolean; id: string } | null>(null);
  const [feePhone, setFeePhone] = useState(''); const [feeNet, setFeeNet] = useState<'MTN'|'Telecel'|'AirtelTigo'>('MTN');
  const [nName, setNName] = useState(''); const [nCat, setNCat] = useState('Electronics'); const [nPrice, setNPrice] = useState(''); const [nDesc, setNDesc] = useState(''); const [nImg, setNImg] = useState(''); const [nPlat, setNPlat] = useState(false);

  const loadInv = () => fetch('/api/sellers/me/products').then(r => r.json()).then(d => setMyProducts(d.data?.products ?? [])).catch(() => setMyProducts([]));
  const load = () => fetch('/api/sellers/me').then(r => { if (r.status === 401) { setAuthError('Please sign in with your seller account.'); return null; } if (r.status === 404) { setNoProfile(true); return null; } return r.json(); }).then(r => { if (r?.status === 'success') { setData(r.data); fetch('/api/admin/sellers').catch(()=>undefined); } else if (r) setError(r.message ?? 'Could not load seller data.'); }).catch(() => setError('Could not load seller data.'));
  useEffect(() => { load(); loadInv(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 5000); };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/sellers/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeName, storeSlug, momoNumber: applyMomo }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Application submitted! Track the status below — an admin will review it and your store tools unlock on approval.'); load();
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

  const payFee = async () => {
    if (!/^0\d{9}$/.test(feePhone)) return flash2('Enter a valid Mobile Money number to pay the fee.');
    setBusy(true);
    try {
      const r = await fetch(`/api/sellers/${data?.seller.id}/registration-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: feePhone, provider: feeNet }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash2(`Pay GH₵${d.data.amount.toFixed(2)} now — ${d.data.instructions} Your store unlocks for review automatically once payment is verified.`);
      load();
    } catch (e) { flash2(e instanceof Error ? e.message : 'Could not start fee payment.', true); }
    finally { setBusy(false); }
  };
  const flash2 = (m: string, err = false) => { err ? setError(m) : setNotice(m); setTimeout(() => { setError(''); setNotice(''); }, 7000); };
  const hideProduct = async (p: MyProduct) => { await fetch(`/api/sellers/me/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock: !p.inStock }) }); loadInv(); };
  const delProduct = async (p: MyProduct) => { if (!confirm(`Delete "${p.name}" permanently?`)) return; const r = await fetch(`/api/sellers/me/products/${p.id}`, { method: 'DELETE' }); const d = await r.json(); flash2(r.ok ? 'Product deleted.' : d.message, !r.ok); loadInv(); };
  const repriceProduct = async (p: MyProduct) => { const np = prompt(`New price for "${p.name}" (current GH₵${p.price.toFixed(2)}):`); if (!np) return; const r = await fetch(`/api/sellers/me/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: Number(np) }) }); const d = await r.json(); flash2(r.ok ? 'Price updated — sent back for admin approval.' : d.message, !r.ok); loadInv(); };
  const uploadProduct = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/sellers/me/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nName, category: nCat, price: Number(nPrice), description: nDesc || undefined, image: nImg || undefined, onPlatform: nPlat }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); setNName(''); setNPrice(''); setNDesc(''); setNImg(''); setNPlat(false); loadInv();
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
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
      <p className="adminEmpty">A one-time registration fee (GH₵30 by default) unlocks admin review — pay it right after applying. Upload your own products, set your prices, sell from your store link and optionally the main marketplace. You deliver, track your order queue, and receive earnings to your Mobile Money account (minus platform commission).</p>
      <form onSubmit={apply} className="productForm">
        <label>Store name<input value={storeName} onChange={e => setStoreName(e.target.value)} required placeholder="DigiTech Accra" /></label>
        <label>Store URL slug<input value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required placeholder="digitech-accra" /></label>
        <label>Mobile Money number<input value={applyMomo} onChange={e => setApplyMomo(e.target.value.replace(/\D/g, '').slice(0, 10))} required inputMode="numeric" placeholder="055 123 4567" /></label>
        <button className="fieldFull" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button>
      </form>
    </section>}
    {data && !data.seller.approved && <section className="catalogTable" style={{ marginBottom: 15 }}>
      <h2 style={{ margin: '0 0 6px' }}>💳 Seller registration fee</h2>
      {data.seller.feePaid
        ? <p className="adminEmpty">✓ Fee received (GH₵{(data.seller.registrationFee ?? 30).toFixed(2)}). Your store is waiting for admin approval — you'll be notified the moment it's live.</p>
        : <div className="productForm" style={{ gridTemplateColumns: '1fr' }}>
            <p className="adminEmpty" style={{ margin: 0 }}>Pay the one-time <b>GH₵{(data.seller.registrationFee ?? 30).toFixed(2)}</b> registration fee to unlock admin review and your store tools.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={feePhone} onChange={e => setFeePhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="MoMo number" style={{ flex: 1, minWidth: 160, border: '1px solid #e2e7ef', borderRadius: 10, padding: 11 }} />
              <select value={feeNet} onChange={e => setFeeNet(e.target.value as 'MTN'|'Telecel'|'AirtelTigo')} style={{ border: '1px solid #e2e7ef', borderRadius: 10, padding: 11 }}>{['MTN','Telecel','AirtelTigo'].map(n => <option key={n}>{n}</option>)}</select>
              <button onClick={payFee} disabled={busy}>Pay GH₵{(data.seller.registrationFee ?? 30).toFixed(2)}</button>
            </div>
          </div>}
    </section>}
    {data && <>
      <section className="catalogTable" style={{ marginBottom: 15 }}>
        <h2 style={{ margin: '0 0 6px' }}>🔗 Your store link — share it everywhere</h2>
        <p style={{ margin: 0, fontSize: 14 }}><b>{typeof window !== 'undefined' ? window.location.origin : ''}/store/{data.seller.storeSlug}</b>{!data.seller.approved && <small style={{ color: '#a45d00' }}> — activates for customers the moment admin approves your store</small>}</p>
        <div className="rowActions" style={{ marginTop: 8 }}>
          <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/store/${data.seller.storeSlug}`).then(() => flash('Store link copied!'))}>Copy link</button>
          <a className="btnLike" style={{ padding: '8px 11px', fontSize: 12 }} href={`/store/${data.seller.storeSlug}`} target="_blank" rel="noreferrer">Preview store →</a>
        </div>
      </section>
      <section className="catalogTable" style={{ marginBottom: 15 }}>
        <h2 style={{ margin: '0 0 8px' }}>📦 My products {myProducts && <small style={{ color: '#68758a' }}>({myProducts.filter(p => p.approvalStatus === 'PENDING').length} awaiting approval)</small>}</h2>
        <p className="adminEmpty">You set your own prices — they apply ONLY in your store (and your store link). Tick “also show on the main marketplace” to reach more buyers for a small platform commission.</p>
        <form onSubmit={uploadProduct} className="productForm">
          <label>Product name<input value={nName} onChange={e => setNName(e.target.value)} required placeholder="e.g. Oraimo FreePods 3" /></label>
          <label>Category<select value={nCat} onChange={e => setNCat(e.target.value)}>{['Electronics','Groceries','Fashion','Home & Essentials','Beauty & Personal Care','Services','Other'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Your price (GH₵)<input value={nPrice} onChange={e => setNPrice(e.target.value)} type="number" min="0.01" step="0.01" required /></label>
          <label>Image URL (optional)<input value={nImg} onChange={e => setNImg(e.target.value)} type="url" placeholder="https://…" /></label>
          <label className="fieldFull">Description<textarea value={nDesc} onChange={e => setNDesc(e.target.value)} rows={2} /></label>
          <label className="checkboxRow fieldFull"><input type="checkbox" checked={nPlat} onChange={e => setNPlat(e.target.checked)} /> Also show on the main marketplace (platform commission applies)</label>
          <button className="fieldFull" disabled={busy}>{busy ? 'Uploading…' : 'Upload for approval'}</button>
        </form>
        {myProducts === null ? <p className="adminEmpty">Loading inventory…</p> : myProducts.length === 0 ? <p className="adminEmpty">No products yet — upload your first one above.</p> : myProducts.map(p => <div className="orderRow" key={p.id} style={{ gridTemplateColumns: 'minmax(140px,1.4fr) minmax(90px,1fr) auto auto', borderTop: '1px solid #e6ebf4' }}>
          <div><b>{p.name}</b><small>{p.category}</small></div>
          <span>GH₵{p.price.toFixed(2)}</span>
          <strong>&nbsp;</strong>
          <em className={`badge ${p.approvalStatus === 'APPROVED' ? 'completed' : p.approvalStatus === 'REJECTED' ? 'failed' : 'pending'}`}>{p.approvalStatus}{p.approvalStatus === 'APPROVED' && (p.onPlatform ? ' · platform' : ' · store only')}</em>
        </div>)}
      </section>
      <StoreGrowthPanel storeSlug={data.seller.storeSlug} canManage={true} />
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
