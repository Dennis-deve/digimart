'use client';

import { useEffect, useState } from 'react';

type Stats = { store: { kind: string; slug: string } | null; visits7: number; visits30: number; orders30: number; completed30: number; conversion: number; revenue30: number; earnings30: number; bestSellers: { name: string; qty: number }[] };
type Coupon = { id: string; code: string; discountType: string; discountValue: number; minimumOrder: number | null; usageLimit: number | null; usageCount: number; endsAt: string | null; active: boolean };

/** Analytics + coupons + banner + QR poster — shared by seller & reseller dashboards. */
export default function StoreGrowthPanel({ storeSlug, canManage }: { storeSlug?: string; canManage: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [code, setCode] = useState(''); const [type, setType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE'); const [value, setValue] = useState(''); const [minOrder, setMinOrder] = useState(''); const [endsAt, setEndsAt] = useState('');
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const load = () => {
    fetch('/api/stores/me/stats').then(r => r.json()).then(d => setStats(d.data)).catch(() => undefined);
    if (canManage) fetch('/api/stores/me/coupons').then(r => r.json()).then(d => setCoupons(d.data ?? [])).catch(() => setCoupons([]));
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string, err = false) => { if (err) setError(m); else setNotice(m); setTimeout(() => { setNotice(''); setError(''); }, 6000); };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch('/api/stores/me/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.toUpperCase(), discountType: type, discountValue: Number(value), minimumOrder: minOrder ? Number(minOrder) : undefined, endsAt: endsAt || undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); setCode(''); setValue(''); setMinOrder(''); setEndsAt(''); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not create coupon.', true); }
    finally { setBusy(false); }
  };
  const toggleCoupon = async (c: Coupon) => { await fetch('/api/stores/me/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, active: !c.active }) }); load(); };
  const uploadBanner = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData(); form.append('image', file);
      const r = await fetch('/api/store/banner', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Banner updated — visit your store to see it.');
    } catch (e) { flash(e instanceof Error ? e.message : 'Upload failed.', true); }
    finally { setBusy(false); }
  };

  const slug = stats?.store?.slug ?? storeSlug;
  return <>
    {stats?.store && <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 10px' }}>📈 Store analytics — last 30 days</h2>
      <div className="catalogStats" style={{ margin: 0 }}>
        <article><b>{stats.visits7}</b><span>Visits this week</span></article>
        <article><b>{stats.visits30}</b><span>Visits (30 days)</span></article>
        <article><b>{stats.orders30}</b><span>Orders ({stats.completed30} completed)</span></article>
        <article><b>{stats.conversion}%</b><span>Visit → order conversion</span></article>
        <article><b>GH₵{stats.revenue30.toFixed(2)}</b><span>Sales through your link</span></article>
        <article><b>GH₵{stats.earnings30.toFixed(2)}</b><span>Your estimated earnings</span></article>
      </div>
      {stats.bestSellers.length > 0 && <div style={{ marginTop: 10 }}>
        <b style={{ fontSize: 13 }}>Best sellers:</b> {stats.bestSellers.map(b => `${b.name} ×${b.qty}`).join(' · ')}
      </div>}
    </section>}

    {slug && <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 8px' }}>🖨 QR poster &amp; banner</h2>
      <p className="adminEmpty">Print the QR poster and share it physically; upload a banner to theme your store.</p>
      <div className="rowActions" style={{ justifyContent: 'flex-start' }}>
        <a className="btnLike" style={{ padding: '9px 13px', fontSize: 13 }} href={`/store/${slug}/poster`} target="_blank" rel="noreferrer">Open printable QR poster</a>
        <a className="btnLike" style={{ padding: '9px 13px', fontSize: 13 }} href={`/api/qr/${slug}`} download={`qr-${slug}.png`}>Download QR (PNG)</a>
      </div>
      {canManage && <label style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700 }}>
        Store banner image (JPG/PNG, ≤10MB)
        <input type="file" accept="image/*" disabled={busy} onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])} style={{ display: 'block', marginTop: 5 }} />
      </label>}
    </section>}

    {canManage && <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 8px' }}>🎟 Coupons &amp; flash sales (your store only)</h2>
      <p className="adminEmpty">Set an end date to make it a flash sale. Codes work only on orders placed in YOUR store.</p>
      <form onSubmit={createCoupon} className="productForm">
        <label>Code<input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} required placeholder="SUMMER10" /></label>
        <label>Type<select value={type} onChange={e => setType(e.target.value as 'FIXED' | 'PERCENTAGE')}><option value="PERCENTAGE">% off</option><option value="FIXED">GH₵ off</option></select></label>
        <label>Value<input value={value} onChange={e => setValue(e.target.value)} type="number" min="0.01" step="0.01" required placeholder={type === 'FIXED' ? 'e.g. 5' : 'e.g. 10'} /></label>
        <label>Min order (GH₵)<input value={minOrder} onChange={e => setMinOrder(e.target.value)} type="number" min="0" step="0.01" /></label>
        <label>Flash sale ends (optional)<input value={endsAt} onChange={e => setEndsAt(e.target.value)} type="date" /></label>
        <button className="fieldFull" disabled={busy}>{busy ? 'Saving…' : 'Create coupon'}</button>
      </form>
      {coupons === null ? <p className="adminEmpty">Loading…</p> : coupons.length === 0 ? <p className="adminEmpty">No store coupons yet.</p> : coupons.map(c => <div className="orderRow" key={c.id} style={{ gridTemplateColumns: 'minmax(110px,1fr) minmax(110px,1.2fr) auto auto', borderTop: '1px solid #e6ebf4' }}>
        <div><b>{c.code}</b><small>{c.endsAt ? `until ${new Date(c.endsAt).toLocaleDateString('en-GB')}` : 'no expiry'}</small></div>
        <span>{c.discountType === 'FIXED' ? `GH₵${c.discountValue.toFixed(2)} off` : `${c.discountValue}% off`}{c.minimumOrder ? ` · min GH₵${c.minimumOrder.toFixed(2)}` : ''} · used {c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</span>
        <strong>&nbsp;</strong>
        <div className="rowActions"><button onClick={() => toggleCoupon(c)}>{c.active ? 'Deactivate' : 'Activate'}</button></div>
      </div>)}
    </section>}
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
  </>;
}
