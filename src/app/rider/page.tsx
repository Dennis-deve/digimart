'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Delivery = { id: string; orderId: string; status: string; pickupAddress: string | null; deliveryAddress: string | null; fee: number; customerPhone: string | null; total: number | null };
const NEXT: Record<string, string> = { ASSIGNED: 'GOING_TO_PICKUP', GOING_TO_PICKUP: 'PICKED_UP', PICKED_UP: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED' };

export default function RiderPage() {
  const [data, setData] = useState<{ available: Delivery[]; mine: Delivery[]; deliveredCount: number } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => fetch('/api/rider/deliveries').then(r => { if (r.status === 401 || r.status === 403) { setError('Sign in with an active RIDER account to see deliveries.'); return null; } return r.json(); }).then(r => { if (r?.status === 'success') setData(r.data); else if (r) setError(r.message); }).catch(() => setError('Could not load deliveries.'));
  useEffect(() => { load(); }, []);
  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 5000); };

  const accept = async (d: Delivery) => { setBusyId(d.id); const r = await fetch(`/api/rider/deliveries/${d.id}/accept`, { method: 'POST' }); const j = await r.json(); if (r.ok) flash(`Delivery ${d.orderId} assigned to you.`); else setError(j.message); setBusyId(''); load(); };
  const advance = async (d: Delivery, status: string) => { setBusyId(d.id); const r = await fetch(`/api/rider/deliveries/${d.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const j = await r.json(); if (r.ok) flash(`${d.orderId}: ${status.replaceAll('_', ' ').toLowerCase()}`); else setError(j.message); setBusyId(''); load(); };

  const Card = ({ d, mine }: { d: Delivery; mine: boolean }) => <article key={d.id} className="orderRow" style={{ gridTemplateColumns: 'minmax(130px,1.2fr) minmax(110px,1fr) auto auto', borderTop: '1px solid #e6ebf4' }}>
    <div><b>{d.orderId}</b><small>{d.pickupAddress ? `From: ${d.pickupAddress}` : 'Pickup: seller location'}{d.deliveryAddress ? ` → To: ${d.deliveryAddress}` : ''}</small></div>
    <span>{d.customerPhone}{d.total ? <small style={{ display: 'block', color: '#68758a' }}>Order GH₵{d.total.toFixed(2)}</small> : null}</span>
    <strong>{d.fee > 0 ? `Fee GH₵${d.fee.toFixed(2)}` : '—'}</strong>
    <div className="rowActions">
      {!mine && d.status === 'AVAILABLE' && <button disabled={busyId === d.id} onClick={() => accept(d)}>Accept</button>}
      {mine && NEXT[d.status] && <button disabled={busyId === d.id} onClick={() => advance(d, NEXT[d.status])}>{NEXT[d.status].replaceAll('_', ' ').toLowerCase()} →</button>}
      {mine && d.status !== 'FAILED' && d.status !== 'DELIVERED' && <button className="danger" disabled={busyId === d.id} onClick={() => advance(d, 'FAILED')}>Fail</button>}
      {d.status !== 'AVAILABLE' && <em className={`badge ${d.status === 'DELIVERED' ? 'completed' : d.status === 'FAILED' ? 'failed' : 'processing'}`}>{d.status.replaceAll('_', ' ')}</em>}
    </div>
  </article>;

  return <main className="productAdmin">
    <header><div><p>RIDER CENTER</p><h1>Deliveries</h1></div><Link href="/" className="btnLike">← Store</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error} <Link href="/sign-in?next=/rider">Sign in</Link></p>}
    {data && <section className="catalogStats">
      <article><b>{data.available.length}</b><span>Available nearby</span></article>
      <article><b>{data.mine.length}</b><span>My active jobs</span></article>
      <article><b>{data.deliveredCount}</b><span>Completed all time</span></article>
    </section>}
    {data && <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 8px' }}>My active jobs</h2>
      {data.mine.length === 0 ? <p className="adminEmpty">No active jobs. Accept one below.</p> : data.mine.map(d => <div key={d.id}>{Card({ d, mine: true })}</div>)}
    </section>}
    {data && <section className="catalogTable" style={{ marginTop: 15 }}>
      <h2 style={{ margin: '0 0 8px' }}>Available deliveries</h2>
      {data.available.length === 0 ? <p className="adminEmpty">No unassigned deliveries right now.</p> : data.available.map(d => <div key={d.id}>{Card({ d, mine: false })}</div>)}
    </section>}
  </main>;
}
