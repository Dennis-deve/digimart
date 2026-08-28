'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Delivery = { id: string; orderId: string; status: string; pickupAddress: string | null; deliveryAddress: string | null; fee: number; customerPhone: string | null; total: number | null };
type RiderProfile = { id: string; active: boolean; city: string | null; earningsBalance: number } | null;
const NEXT: Record<string, string> = { ASSIGNED: 'GOING_TO_PICKUP', GOING_TO_PICKUP: 'PICKED_UP', PICKED_UP: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED' };

export default function RiderPage() {
  const [profile, setProfile] = useState<RiderProfile | undefined>(undefined); // undefined = loading
  const [jobs, setJobs] = useState<{ available: Delivery[]; mine: Delivery[]; deliveredCount: number } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  // apply form
  const [city, setCity] = useState('');
  // payout form
  const [payOpen, setPayOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pMomo, setPMomo] = useState('');
  const [pNet, setPNet] = useState('MTN');

  const load = () => {
    fetch('/api/riders/me').then(r => r.ok ? r.json() : { data: { rider: undefined } }).then(d => setProfile(d.data.rider ?? null)).catch(() => setProfile(null));
    fetch('/api/rider/deliveries').then(r => r.ok ? r.json() : null).then(d => setJobs(d?.data ?? null)).catch(() => undefined);
  };
  useEffect(() => { load(); }, []);
  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 6000); };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault(); setBusyId('apply');
    try {
      const r = await fetch('/api/riders/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not apply.'); }
    finally { setBusyId(''); }
  };

  const requestPayout = async () => {
    if (pName.trim().length < 2) return flash('Enter the Mobile Money account name.');
    if (!/^0\d{9}$/.test(pMomo)) return flash('Enter a valid 10-digit Mobile Money number.');
    setBusyId('payout');
    try {
      const r = await fetch('/api/riders/me/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ momoName: pName.trim(), momoNumber: pMomo, network: pNet }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(d.data.message); setPayOpen(false); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not request payout.'); }
    finally { setBusyId(''); }
  };

  const accept = async (d: Delivery) => { setBusyId(d.id); const r = await fetch(`/api/rider/deliveries/${d.id}/accept`, { method: 'POST' }); const j = await r.json(); r.ok ? flash(`Delivery ${d.orderId} assigned to you.`) : setError(j.message); setBusyId(''); load(); };
  const advance = async (d: Delivery, status: string) => { setBusyId(d.id); const r = await fetch(`/api/rider/deliveries/${d.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const j = await r.json(); r.ok ? flash(status === 'DELIVERED' ? `${d.orderId} delivered ✓ — order completed and earnings credited.` : `${d.orderId}: ${status.replaceAll('_', ' ').toLowerCase()}`) : setError(j.message); setBusyId(''); load(); };

  const Card = ({ d, mine }: { d: Delivery; mine: boolean }) => <article className="orderRow" style={{ gridTemplateColumns: 'minmax(130px,1.2fr) minmax(110px,1fr) auto auto', borderTop: '1px solid #e6ebf4' }}>
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

    {profile === undefined && <p className="adminEmpty">Loading…</p>}

    {profile === null && <section className="catalogTable">
      <h2 style={{ margin: '0 0 8px' }}>Become a DigiMart rider</h2>
      <p className="adminEmpty">Deliver physical orders in your area, progress them with one tap, and earn a share of every delivery fee — paid to your Mobile Money.</p>
      <form onSubmit={apply} className="productForm">
        <label className="fieldFull">City / area you will deliver in<input value={city} onChange={e => setCity(e.target.value)} required placeholder="e.g. Accra — Osu, Labadi, Teshie" /></label>
        <button className="fieldFull" disabled={busyId === 'apply'}>{busyId === 'apply' ? 'Submitting…' : 'Apply to ride'}</button>
      </form>
    </section>}

    {profile && !profile.active && <section className="catalogTable">
      <h2 style={{ margin: '0 0 8px' }}>Application under review ⏳</h2>
      <p className="adminEmpty">We received your rider application{profile.city ? ` for ${profile.city}` : ''}. An admin will activate your account — this page unlocks automatically, no need to sign in again.</p>
    </section>}

    {profile?.active && <>
      <section className="catalogStats">
        <article><b>{jobs?.available.length ?? 0}</b><span>Available now</span></article>
        <article><b>{jobs?.mine.length ?? 0}</b><span>My active jobs</span></article>
        <article><b>{jobs?.deliveredCount ?? 0}</b><span>Completed all time</span></article>
        <article><b>GH₵{profile.earningsBalance.toFixed(2)}</b><span>Earnings balance</span></article>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 8px' }}>Rider earnings</h2>
        <p className="adminEmpty">You earn a share of every delivery fee automatically when you mark a job DELIVERED.{' '}
          <button disabled={busyId === 'payout' || profile.earningsBalance < 5} onClick={() => setPayOpen(true)}>Request payout (min GH₵5)</button>
        </p>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 8px' }}>My active jobs</h2>
        {jobs?.mine.length ? jobs.mine.map(d => <div key={d.id}>{Card({ d, mine: true })}</div>) : <p className="adminEmpty">No active jobs — accept one below.</p>}
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 8px' }}>Available deliveries</h2>
        {jobs?.available.length ? jobs.available.map(d => <div key={d.id}>{Card({ d, mine: false })}</div>) : <p className="adminEmpty">No unassigned deliveries right now.</p>}
      </section>
    </>}

    {payOpen && <div className="overlay" onClick={() => setPayOpen(false)}><section className="checkout" onClick={e => e.stopPropagation()}>
      <button className="close" onClick={() => setPayOpen(false)}>×</button>
      <p className="eyebrow">RIDER PAYOUT</p><h2>Withdraw your earnings</h2>
      <p className="sub">Admin sends GH₵{profile?.earningsBalance.toFixed(2)} to your Mobile Money.</p>
      <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Mobile Money account name" />
      <input value={pMomo} onChange={e => setPMomo(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="Mobile Money number" />
      <div className="networkSelect">{['MTN', 'Telecel', 'AirtelTigo'].map(n => <button type="button" key={n} className={pNet === n ? 'selected' : ''} onClick={() => setPNet(n)}>{n}</button>)}</div>
      <button className="payment" disabled={busyId === 'payout'} onClick={requestPayout}>{busyId === 'payout' ? 'Requesting…' : `Request GH₵${profile?.earningsBalance.toFixed(2)}`}</button>
    </section></div>}
  </main>;
}
