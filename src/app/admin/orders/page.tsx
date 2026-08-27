'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type OrderItem = { id: string; name: string; network: string | null; source: string; qty: number; unitPrice: number; fulfillment: string; externalRef: string | null };
type AdminOrder = { id: string; createdAt: string; customerPhone: string; status: string; total: number; discount: number; deliveryFee: number; deliveryMethod: string | null; couponCode: string | null; paymentRef: string | null; items: OrderItem[] };

const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
const sourceName = (s: string) => s === 'BUNDLESHOPGH' ? 'BundleShopGH' : s === 'MUVIIN' ? 'Muviin' : s === 'REFER2BUNDLE' ? 'Refer2Bundle' : 'DigiMart';

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [openId, setOpenId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/orders${filter !== 'ALL' ? `?status=${filter}` : ''}`).then(r => r.json()).then(r => { if (r.status === 'success') setOrders(r.data); else setError(r.message ?? 'Could not load orders.'); }).catch(() => setError('Could not load orders.'));
  }, [filter]);

  const fulfillItem = async (id: string, fulfillment: 'FULFILLED' | 'FAILED') => {
    const note = prompt('Optional note (saved to the order item):') ?? undefined;
    const r = await fetch(`/api/admin/order-items/${id}/fulfill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fulfillment, note }) });
    const d = await r.json();
    if (!r.ok) return alert(d.message ?? 'Update failed.');
    setOrders(null); fetch(`/api/admin/orders${filter !== 'ALL' ? `?status=${filter}` : ''}`).then(res => res.json()).then(res => setOrders(res.data));
  };

  return <main className="admin">
    <aside>
      <div className="logo"><span>Digi</span><b>Mart</b></div>
      <p>ADMIN CONTROL CENTER</p>
      <Link href="/admin">Overview</Link>
      <Link href="/admin/orders" className="active">Orders</Link>
      <Link href="/admin/products">Products</Link>
      <Link href="/admin/support">Support</Link>
      <Link href="/admin/announcements">Announcements</Link>
      <Link href="/admin/coupons">Coupons</Link>
      <Link href="/admin/payouts">Payouts</Link>
      <Link href="/admin/refunds">Refunds</Link>
      <Link href="/admin/partners">Partners</Link>
      <Link href="/">← Back to store</Link>
    </aside>
    <section>
      <header><div><p>ALL PLATFORM ORDERS</p><h1>Orders</h1></div></header>
      {error && <p className="adminNotice err">{error}</p>}
      <div className="filterChips">{FILTERS.map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => { setFilter(f); setOrders(null); setError(''); }}>{f}</button>)}</div>
      <div className="orders">
        {orders === null && !error && <p className="adminEmpty">Loading orders…</p>}
        {orders !== null && orders.length === 0 && <p className="adminEmpty">No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders yet.</p>}
        {orders?.map(o => <div key={o.id}>
          <div className="orderRow" onClick={() => setOpenId(openId === o.id ? '' : o.id)}>
            <div><b>{o.id}</b><small>{new Date(o.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {o.items.length} item(s)</small></div>
            <span>{o.customerPhone}</span>
            <strong>GH₵{o.total.toFixed(2)}</strong>
            <em className={`badge ${o.status.toLowerCase()}`}>{o.status}</em>
          </div>
          {openId === o.id && <div className="orderDetail">
            {o.paymentRef && <p><b>Payment ref:</b> {o.paymentRef}</p>}
            {o.couponCode && <p><b>Coupon:</b> {o.couponCode} (−GH₵{o.discount.toFixed(2)})</p>}
            {o.deliveryMethod && <p><b>Delivery:</b> {o.deliveryMethod.replaceAll('_', ' ').toLowerCase()} (+GH₵{o.deliveryFee.toFixed(2)})</p>}
            <table><thead><tr><th>Item</th><th>Source</th><th>Qty</th><th>Price</th><th>Fulfilment</th></tr></thead>
              <tbody>{o.items.map(i => <tr key={i.id}><td>{i.name}{i.network ? ` (${i.network})` : ''}</td><td>{sourceName(i.source)}</td><td>{i.qty}</td><td>GH₵{i.unitPrice.toFixed(2)}</td><td>{i.fulfillment}{i.fulfillment === 'PENDING' && <span className="manualActions"><button onClick={() => fulfillItem(i.id, 'FULFILLED')}>✓ done</button><button className="danger" onClick={() => fulfillItem(i.id, 'FAILED')}>✗ failed</button></span>}</td></tr>)}</tbody></table>
          </div>}
        </div>)}
      </div>
    </section>
  </main>;
}
