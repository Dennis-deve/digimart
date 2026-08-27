'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Refund = { id: string; orderId: string; userId: string | null; amount: number; reason: string; status: string; resolutionNote: string | null; refundReference: string | null; createdAt: string; customerPhone: string | null; paymentRef: string | null };

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<Refund[] | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = () => fetch('/api/admin/refunds').then(r => r.json()).then(r => { if (r.status === 'success') setRefunds(r.data); else setError(r.message ?? 'Could not load refunds.'); }).catch(() => setError('Could not load refunds.'));
  useEffect(() => { load(); }, []);
  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 6000); };

  const resolve = async (r0: Refund, status: string) => {
    let note = '';
    let reference: string | undefined;
    if (status === 'REFUNDED') { reference = prompt('MoMo refund transfer reference (optional):') ?? undefined; }
    note = prompt(`Resolution note for ${r0.orderId}:`, r0.resolutionNote ?? '') ?? '';
    const r = await fetch(`/api/admin/refunds/${r0.id}/resolve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, resolutionNote: note || undefined, refundReference: reference }) });
    const d = await r.json();
    if (!r.ok) return flash(d.message ?? 'Update failed.', true);
    flash(`Refund ${r0.orderId} → ${status}. REFUNDED credits the customer's DigiMart wallet.`);
    load();
  };

  return <main className="productAdmin">
    <header><div><p>ADMIN / PAYMENTS</p><h1>Refund requests</h1></div><Link href="/admin" className="btnLike">← Overview</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    <section className="catalogTable">
      <div className="tableHead"><span>Order</span><span>Reason</span><span>Amount</span><span>Status</span><span /></div>
      {refunds === null ? <p className="adminEmpty">Loading…</p> : refunds.length === 0 ? <p className="adminEmpty">No refund requests. Customers request refunds from their order history.</p> : refunds.map(r => <article key={r.id}>
        <div><b>{r.orderId}</b><small>{r.customerPhone ?? 'guest'} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div>
        <span style={{ maxWidth: 260 }}>{r.reason}</span>
        <strong>GH₵{r.amount.toFixed(2)}</strong>
        <em className={`badge ${r.status === 'REFUNDED' || r.status === 'APPROVED' ? 'completed' : r.status === 'REJECTED' || r.status === 'FAILED' ? 'failed' : 'pending'}`}>{r.status.replaceAll('_', ' ')}</em>
        <div className="rowActions">
          {r.status !== 'REFUNDED' && r.status !== 'REJECTED' && <>
            <button onClick={() => resolve(r, 'APPROVED')}>Approve</button>
            <button onClick={() => resolve(r, 'REFUNDED')}>Mark refunded</button>
            <button className="danger" onClick={() => resolve(r, 'REJECTED')}>Reject</button>
          </>}
        </div>
      </article>)}
    </section>
  </main>;
}
