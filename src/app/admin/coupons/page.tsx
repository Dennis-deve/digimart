'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Coupon = { id: string; code: string; discountType: string; discountValue: number; minimumOrder: number | null; usageLimit: number | null; usageCount: number; startsAt: string | null; endsAt: string | null; active: boolean };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => fetch('/api/admin/coupons').then(r => r.json()).then(r => { if (r.status === 'success') setCoupons(r.data); else setError(r.message ?? 'Could not load coupons.'); }).catch(() => setError('Could not load coupons.'));
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 4000); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.toUpperCase(), discountType: type, discountValue: Number(value), minimumOrder: minOrder ? Number(minOrder) : undefined, usageLimit: usageLimit ? Number(usageLimit) : undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? 'Could not create coupon.');
      flash(`Coupon ${code.toUpperCase()} created.`); setCode(''); setValue(''); setMinOrder(''); setUsageLimit(''); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not create coupon.', true); }
    finally { setBusy(false); }
  };
  const toggle = async (c: Coupon) => { const r = await fetch(`/api/admin/coupons/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }) }); const d = await r.json(); if (!r.ok) return flash(d.message ?? 'Update failed.', true); flash(`${c.code} ${!c.active ? 'activated' : 'deactivated'}.`); load(); };
  const remove = async (c: Coupon) => { if (!confirm(`Delete coupon ${c.code}?`)) return; const r = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' }); const d = await r.json(); if (!r.ok) return flash(d.message ?? 'Delete failed.', true); flash(`${c.code} deleted.`); load(); };

  return <main className="productAdmin">
    <header><div><p>ADMIN / PROMOTIONS</p><h1>Coupons</h1></div><Link href="/admin">← Overview</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    <section className="catalogTable">
      <form onSubmit={create} className="productForm">
        <label>Code<input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} required placeholder="SUMMER10" /></label>
        <label>Type<select value={type} onChange={e => setType(e.target.value as 'FIXED' | 'PERCENTAGE')}><option value="FIXED">Fixed GH₵ off</option><option value="PERCENTAGE">Percentage off</option></select></label>
        <label>Value<input value={value} onChange={e => setValue(e.target.value)} type="number" min="0.01" step="0.01" required placeholder={type === 'FIXED' ? 'e.g. 5' : 'e.g. 10 (%)'} /></label>
        <label>Minimum order (GH₵, optional)<input value={minOrder} onChange={e => setMinOrder(e.target.value)} type="number" min="0" step="0.01" /></label>
        <label>Usage limit (optional)<input value={usageLimit} onChange={e => setUsageLimit(e.target.value)} type="number" min="1" step="1" /></label>
        <label>&nbsp;<button disabled={busy} className="fieldFull">{busy ? 'Creating…' : 'Create coupon'}</button></label>
      </form>
    </section>
    <section className="catalogTable" style={{ marginTop: 15 }}>
      <div className="tableHead"><span>Code</span><span>Discount</span><span>Min order</span><span>Used</span><span>Status</span><span /></div>
      {coupons === null ? <p className="adminEmpty">Loading…</p> : coupons.length === 0 ? <p className="adminEmpty">No coupons yet.</p> : coupons.map(c => <article key={c.id}>
        <div><b>{c.code}</b></div>
        <span>{c.discountType === 'FIXED' ? `GH₵${c.discountValue.toFixed(2)} off` : `${c.discountValue}% off`}</span>
        <span>{c.minimumOrder ? `GH₵${c.minimumOrder.toFixed(2)}` : '—'}</span>
        <span>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span>
        <em className={`badge ${c.active ? 'completed' : 'failed'}`}>{c.active ? 'Active' : 'Inactive'}</em>
        <div className="rowActions">
          <button onClick={() => toggle(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
          <button className="danger" onClick={() => remove(c)}>Delete</button>
        </div>
      </article>)}
    </section>
  </main>;
}
