'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StoreGrowthPanel from '@/components/store-growth-panel';

type ResellerData = { reseller: { id: string; storeName: string; storeSlug: string; status: string; feePaid: boolean; earningsBalance: number; defaultMarkupPct: number; payoutName: string | null; payoutMomo: string | null; payoutNetwork: string | null; storeTagline: string | null; storeColor: string | null } };
type Payout = { id: string; amount: number; status: string; requestedAt: string };

export default function ResellerPage() {
  const [data, setData] = useState<ResellerData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [authError, setAuthError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // apply form
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [momo, setMomo] = useState('');
  const [applied, setApplied] = useState<{ fee: number; slug: string } | null>(null);
  // payout form
  const [pName, setPName] = useState('');
  const [pMomo, setPMomo] = useState('');
  const [pNet, setPNet] = useState('MTN');
  const [markup, setMarkup] = useState('');
  const [linkOrders, setLinkOrders] = useState<{ id: string; createdAt: string; status: string; total: number; itemCount: number; firstItem: string; earnings: number }[] | null>(null);
  const [tagline, setTagline] = useState('');
  const [storeColor, setStoreColor] = useState('#071c42');

  const load = () => {
    fetch('/api/resellers/me/payout').then(r => { if (r.status === 401) { setAuthError('Sign in to manage your reseller store.'); return null; } if (r.status === 404) return null; return r.json(); }).then(r => { if (r?.status === 'success') { setData(r.data); setMarkup(String(r.data.reseller.defaultMarkupPct)); } }).catch(() => undefined);
    fetch('/api/resellers/me/payouts').then(r => r.ok ? r.json() : null).then(r => { if (Array.isArray(r?.data)) setPayouts(r.data); }).catch(() => undefined);
    fetch('/api/resellers/me/orders').then(r => r.ok ? r.json() : null).then(r => { if (Array.isArray(r?.data)) setLinkOrders(r.data); }).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 6000); };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/resellers/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeName, storeSlug, momoNumber: momo }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setApplied({ fee: d.data.registrationFee, slug: d.data.storeSlug }); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not apply.', true); }
    finally { setBusy(false); }
  };

  const savePayout = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/resellers/me/payout', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutName: pName, payoutMomo: pMomo, payoutNetwork: pNet }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not save.', true); }
    finally { setBusy(false); }
  };

  const saveStore = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/resellers/me/payout', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeTagline: tagline, storeColor }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Storefront updated — see it at /store/' + (data?.reseller.storeSlug ?? '')); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not save store.', true); }
    finally { setBusy(false); }
  };
  const saveMarkup = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/resellers/me/markup', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultMarkupPct: Number(markup) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Default markup updated.'); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not save markup.', true); }
    finally { setBusy(false); }
  };

  const requestPayout = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/resellers/me/payouts', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(`Payout of GH₵${d.data.amount.toFixed(2)} requested.`); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not request payout.', true); }
    finally { setBusy(false); }
  };

  return <main className="portal">
    <header><Link href="/" className="logo"><span>Digi</span><b>Mart</b></Link><Link href="/">← Back to marketplace</Link></header>
    <section className="portalHero"><p>RESELLER PROGRAM</p><h1>{data ? data.reseller.storeName : 'Own a DigiMart store'}</h1><span>{data ? 'Your store, your prices, your earnings — powered by DigiMart fulfilment.' : 'Apply, pay the registration fee, get approved and share your own store link with custom markups.'}</span></section>
    {notice && <p className="formSuccess">{notice}</p>}
    {error && <p className="formSuccess" style={{ background: '#fde8e8', color: '#a11c1c' }}>{error}</p>}
    {authError && !data && <p className="formSuccess" style={{ background: '#fde8e8', color: '#a11c1c' }}>{authError} <Link href="/sign-in?next=/reseller">Sign in</Link></p>}

    {!data && !applied && <section className="application"><h2>Reseller application</h2>
      <form onSubmit={apply}>
        <label>Store name<input value={storeName} onChange={e => setStoreName(e.target.value)} required placeholder="e.g. Bright Data Hub"/></label>
        <label>Store URL slug<input value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required placeholder="e.g. brightdatahub"/></label>
        <label>Mobile Money number<input value={momo} onChange={e => setMomo(e.target.value.replace(/\D/g, '').slice(0, 10))} required inputMode="numeric" placeholder="055 123 4567"/></label>
        {error && <p className="formError">{error}</p>}
        <button disabled={busy}>{busy ? 'Creating application…' : 'Continue to registration payment →'}</button>
      </form>
    </section>}

    {applied && <section className="application"><h2>Application created — /store/{applied.slug}</h2><p>Approve the Mobile Money prompt to pay the GH₵{applied.fee.toFixed(2)} registration fee. Payment is verified by the Moolre webhook, then an admin reviews your store. Refresh this page afterwards.</p><button onClick={() => location.reload()}>I have paid — refresh status</button></section>}

    {data && <>
      <section className="catalogStats">
        <article><b>{data.reseller.status}{data.reseller.feePaid ? ' · fee paid ✓' : ' · fee unpaid'}</b><span>Store status · /store/{data.reseller.storeSlug}</span></article>
        <article><b>GH₵{data.reseller.earningsBalance.toFixed(2)}</b><span>Markup earnings balance</span></article>
        <article><b>{payouts.length}</b><span>Payout requests</span></article>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Store settings</h2>
        <div className="productForm">
          <label>Default markup (%)<input value={markup} onChange={e => setMarkup(e.target.value)} type="number" min="0" max="100" step="0.5"/></label>
          <button onClick={saveMarkup} disabled={busy} className="fieldFull">{busy ? 'Saving…' : 'Save markup'}</button>
        </div>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Storefront — /store/{data.reseller.storeSlug}</h2>
        <div className="productForm">
          <label className="fieldFull">Store tagline<input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Fast data, fair prices — Accra" maxLength={160}/></label>
          <label>Brand color<input value={storeColor} onChange={e => setStoreColor(e.target.value)} type="color" style={{ height: 44, padding: 4 }}/></label>
          <button className="fieldFull" onClick={saveStore} disabled={busy}>{busy ? 'Saving…' : 'Save storefront'}</button>
          <a className="fieldFull btnLike" style={{ textAlign: 'center' }} href={'/store/' + data.reseller.storeSlug} target="_blank" rel="noreferrer">Preview my store →</a>
        </div>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Payout account — where your earnings go</h2>
        <form onSubmit={savePayout} className="productForm">
          <label>Account / MOMO name<input value={pName} onChange={e => setPName(e.target.value)} required placeholder={data.reseller.payoutName ?? 'e.g. Ama Darko'}/></label>
          <label>Mobile Money number<input value={pMomo} onChange={e => setPMomo(e.target.value.replace(/\D/g, '').slice(0, 10))} required inputMode="numeric" placeholder={data.reseller.payoutMomo ?? '055 123 4567'}/></label>
          <label>Network<select value={pNet} onChange={e => setPNet(e.target.value)}>{['MTN', 'Telecel', 'AirtelTigo'].map(n => <option key={n}>{n}</option>)}</select></label>
          <button disabled={busy}>{busy ? 'Saving…' : 'Save payout account'}</button>
        </form>
        {data.reseller.payoutMomo && data.reseller.earningsBalance > 0 && <p className="adminEmpty">Current: <b>{data.reseller.payoutName}</b> · {data.reseller.payoutMomo} ({data.reseller.payoutNetwork}) — <button onClick={requestPayout} disabled={busy}>Request payout of GH₵{data.reseller.earningsBalance.toFixed(2)}</button></p>}
      </section>
      <section className="catalogTable">
        <h2 style={{ margin: '0 0 8px' }}>📦 Orders via my link</h2>
        {linkOrders === null ? <p className="adminEmpty">Loading…</p> : linkOrders.length === 0 ? <p className="adminEmpty">No orders through your store link yet — share it to start earning.</p> : linkOrders.map(o => <div className="orderRow" key={o.id} style={{ gridTemplateColumns: 'minmax(130px,1.3fr) minmax(90px,1fr) auto auto', borderTop: '1px solid #e6ebf4' }}>
          <div><b>{o.id}</b><small>{o.firstItem}{o.itemCount > 1 ? ` +${o.itemCount - 1}` : ''}</small></div>
          <span>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <strong>GH₵{o.total.toFixed(2)} <small style={{ color: '#00836f', fontWeight: 800 }}>+{o.earnings.toFixed(2)}</small></strong>
          <em className={`badge ${o.status.toLowerCase()}`}>{o.status}</em>
        </div>)}
      </section>
      <StoreGrowthPanel storeSlug={data.reseller.storeSlug} canManage={true} />
      {payouts.length > 0 && <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ marginTop: 0 }}>Payout history</h2>
        {payouts.map(p => <div className="orderRow" key={p.id} style={{ gridTemplateColumns: 'minmax(120px,1fr) minmax(90px,1fr) auto auto' }}>
          <div><b>{new Date(p.requestedAt).toLocaleDateString('en-GB')}</b><small>{p.id}</small></div>
          <span>GH₵{p.amount.toFixed(2)}</span>
          <strong>&nbsp;</strong>
          <em className={`badge ${p.status === 'PAID' ? 'completed' : p.status === 'REJECTED' ? 'failed' : 'pending'}`}>{p.status}</em>
        </div>)}
      </section>}
    </>}
    <section className="steps"><div><b>1</b><h3>Apply</h3><p>Share your store details.</p></div><div><b>2</b><h3>Pay fee</h3><p>Registration payment is verified securely.</p></div><div><b>3</b><h3>Get approved</h3><p>DigiMart reviews your application.</p></div><div><b>4</b><h3>Start selling</h3><p>Share your personal store link.</p></div></section>
  </main>;
}
