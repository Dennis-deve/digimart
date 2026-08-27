'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Seller = { id: string; storeName: string; storeSlug: string; approved: boolean; earningsBalance: number; payoutMomo: string | null; user: { phone: string; email: string | null } };
type Reseller = { id: string; storeName: string; storeSlug: string; status: string; feePaid: boolean; registrationFee: number; earningsBalance: number; user: { phone: string; email: string | null } };

export default function AdminPartners() {
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [resellers, setResellers] = useState<Reseller[] | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => {
    fetch('/api/admin/sellers').then(r => r.json()).then(d => setSellers(d.data ?? [])).catch(() => setSellers([]));
    fetch('/api/admin/resellers').then(r => r.json()).then(d => setResellers(d.data ?? [])).catch(() => setResellers([]));
  };
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 6000); };

  const call = async (url: string, label: string) => {
    setBusyId(url);
    try {
      const r = await fetch(url, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(label); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Action failed.', true); }
    finally { setBusyId(''); }
  };

  return <main className="productAdmin">
    <header><div><p>ADMIN / PARTNERS</p><h1>Sellers &amp; resellers</h1></div><Link href="/admin" className="btnLike">← Overview</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}

    <section className="catalogTable">
      <h2 style={{ margin: '0 0 10px' }}>Reseller applications {resellers && <small style={{ color: '#68758a' }}>({resellers.filter(r => r.status === 'PENDING').length} pending)</small>}</h2>
      {resellers === null ? <p className="adminEmpty">Loading…</p> : resellers.length === 0 ? <p className="adminEmpty">No reseller applications yet. Customers apply at /reseller.</p> : resellers.map(r => <article key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) minmax(110px,1fr) auto auto', gap: 10, alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e6ebf4' }}>
        <div><b>{r.storeName}</b><small style={{ display: 'block', color: '#68758a' }}>/{r.storeSlug} · {r.user.phone}{r.user.email ? ` · ${r.user.email}` : ''}</small></div>
        <span>Fee GH₵{r.registrationFee.toFixed(2)} — {r.feePaid ? <b style={{ color: '#00836f' }}>paid ✓</b> : <b style={{ color: '#a11c1c' }}>unpaid</b>}</span>
        <em className={`badge ${r.status === 'APPROVED' ? 'completed' : r.status === 'REJECTED' ? 'failed' : 'pending'}`}>{r.status}</em>
        <div className="rowActions">
          {!r.feePaid && r.status === 'PENDING' && <button disabled={busyId === `fee-${r.id}`} onClick={() => call(`/api/admin/resellers/${r.id}/mark-fee-paid`, 'Fee marked as received (manual).')} title="Use when the fee was paid outside Moolre">Mark fee received</button>}
          {r.feePaid && r.status === 'PENDING' && <button disabled={busyId === `app-${r.id}`} onClick={() => call(`/api/admin/resellers/${r.id}/approve`, `${r.storeName} approved — owner is now a RESELLER.`)}>Approve</button>}
          {r.status === 'PENDING' && <button className="danger" disabled={busyId === `rej-${r.id}`} onClick={() => call(`/api/admin/resellers/${r.id}/reject`, `${r.storeName} rejected.`)}>Reject</button>}
        </div>
      </article>)}
    </section>

    <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 10px' }}>Seller applications {sellers && <small style={{ color: '#68758a' }}>({sellers.filter(s => !s.approved).length} pending)</small>}</h2>
      {sellers === null ? <p className="adminEmpty">Loading…</p> : sellers.length === 0 ? <p className="adminEmpty">No seller applications yet. Customers apply at /seller.</p> : sellers.map(s => <article key={s.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) minmax(110px,1fr) auto auto', gap: 10, alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e6ebf4' }}>
        <div><b>{s.storeName}</b><small style={{ display: 'block', color: '#68758a' }}>/{s.storeSlug} · {s.user.phone}</small></div>
        <span>Earnings GH₵{s.earningsBalance.toFixed(2)}{s.payoutMomo ? ` · →${s.payoutMomo}` : ''}</span>
        <em className={`badge ${s.approved ? 'completed' : 'pending'}`}>{s.approved ? 'APPROVED' : 'PENDING'}</em>
        <div className="rowActions">
          {!s.approved && <button disabled={busyId === `sapp-${s.id}`} onClick={() => call(`/api/admin/sellers/${s.id}/approve`, `${s.storeName} approved — owner is now a SELLER.`)}>Approve</button>}
        </div>
      </article>)}
    </section>
  </main>;
}
