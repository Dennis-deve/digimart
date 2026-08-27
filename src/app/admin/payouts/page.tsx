'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Payout = { id: string; amount: number; status: string; requestedAt: string; paidAt: string | null; momoRef: string | null; recipient: string | null; recipientName: string | null; recipientNetwork: string | null; store: string | null; kind: string; moolreReady: boolean };

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => fetch('/api/admin/payouts').then(r => r.json()).then(r => { if (r.status === 'success') setPayouts(r.data); else setError(r.message ?? 'Could not load payouts.'); }).catch(() => setError('Could not load payouts.'));
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 6000); };

  const sendViaMoolre = async (p: Payout) => {
    if (!confirm(`Send GH₵${p.amount.toFixed(2)} to ${p.recipientName} (${p.recipient}, ${p.recipientNetwork}) via Moolre transfer?`)) return;
    setBusyId(p.id);
    try {
      const r = await fetch(`/api/admin/payouts/${p.id}/send`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash(`Payout sent via Moolre. Reference ${d.data.reference}.`);
      load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Transfer failed.', true); }
    finally { setBusyId(''); }
  };

  const markPaid = async (p: Payout) => {
    const ref = prompt(`Enter the MoMo transfer reference for this manual payment of GH₵${p.amount.toFixed(2)} to ${p.recipient ?? 'recipient'}:`);
    if (!ref || ref.length < 4) return;
    setBusyId(p.id);
    try {
      const r = await fetch(`/api/admin/payouts/${p.id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ momoRef: ref }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      flash('Payout marked as paid.');
      load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Update failed.', true); }
    finally { setBusyId(''); }
  };

  const pending = payouts?.filter(p => p.status === 'PENDING') ?? [];
  return <main className="productAdmin">
    <header><div><p>ADMIN / PAYMENTS</p><h1>Payouts to sellers &amp; resellers</h1></div><Link href="/admin" className="btnLike">← Overview</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    <section className="catalogStats">
      <article><b>{pending.length}</b><span>Pending requests</span></article>
      <article><b>GH₵{pending.reduce((s, p) => s + p.amount, 0).toFixed(2)}</b><span>Pending amount</span></article>
      <article><b>{payouts?.filter(p => p.status === 'PAID').length ?? 0}</b><span>Paid out</span></article>
    </section>
    <section className="catalogTable" style={{ marginTop: 15 }}>
      <div className="tableHead"><span>Store</span><span>Recipient</span><span>Amount</span><span>Status</span><span /></div>
      {payouts === null ? <p className="adminEmpty">Loading…</p> : payouts.length === 0 ? <p className="adminEmpty">No payout requests yet. Sellers and resellers request payouts from their dashboards.</p> : payouts.map(p => <article key={p.id}>
        <div><b>{p.store ?? '—'}</b><small>{p.kind} · {new Date(p.requestedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{p.momoRef ? ` · ${p.momoRef}` : ''}</small></div>
        <span>{p.recipientName ?? '⚠ no account'}{p.recipient ? <small style={{ display: 'block', color: '#68758a' }}>{p.recipient} ({p.recipientNetwork})</small> : null}</span>
        <strong>GH₵{p.amount.toFixed(2)}</strong>
        <em className={`badge ${p.status === 'PAID' ? 'completed' : p.status === 'REJECTED' ? 'failed' : 'pending'}`}>{p.status}</em>
        <div className="rowActions">
          {p.status === 'PENDING' && p.moolreReady && <button disabled={busyId === p.id} onClick={() => sendViaMoolre(p)}>Send via Moolre</button>}
          {p.status === 'PENDING' && <button disabled={busyId === p.id} onClick={() => markPaid(p)}>Mark paid manually</button>}
        </div>
      </article>)}
    </section>
  </main>;
}
