'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  ordersTotal: number; ordersToday: number; grossSales: number; pendingPayments: number; failed: number;
  productsActive: number; productsHidden: number; users: Record<string, number>;
  ticketsOpen: number; resellersPending: number; payoutsPending: number;
  recentOrders: { id: string; createdAt: string; customerPhone: string; status: string; total: number; itemCount: number; firstItem: string }[];
};

const NAV = [
  { label: 'Overview', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Support', href: '/admin/support' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Coupons', href: '/admin/coupons' },
  { label: 'Payouts', href: '/admin/payouts' },
  { label: 'Refunds', href: '/admin/refunds' },
];
const SOON = ['Providers', 'Resellers', 'Sellers', 'Delivery', 'Payments', 'Wallets', 'Promotions', 'Settings'];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(r => { if (r.status === 'success') setStats(r.data); else setError(r.message ?? 'Could not load stats.'); }).catch(() => setError('Could not load stats.'));
  }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return <main className="admin">
    <aside>
      <div className="logo"><span>Digi</span><b>Mart</b></div>
      <p>ADMIN CONTROL CENTER</p>
      {NAV.map(n => <Link key={n.label} href={n.href} className={n.href === '/admin' ? 'active' : ''}>{n.label}</Link>)}
      {SOON.map(s => <button key={s} disabled title="Coming soon">{s}</button>)}
      <Link href="/">← Back to store</Link>
    </aside>
    <section>
      <header><div><p>{today}</p><h1>Admin overview</h1></div><Link href="/admin/products/new" className="btnLike">＋ Add product</Link></header>
      {error && <p className="adminNotice err">{error}</p>}
      {!stats && !error && <p className="adminEmpty">Loading live platform data…</p>}
      {stats && <>
        <div className="metrics">
          <article><span>Gross sales (completed)</span><b>GH₵{stats.grossSales.toFixed(2)}</b><small>{stats.ordersTotal} order(s) all time</small></article>
          <article><span>Orders today</span><b>{stats.ordersToday}</b><small>{stats.pendingPayments} awaiting payment</small></article>
          <article><span>Failed orders</span><b>{stats.failed}</b><small>Payment never verified</small></article>
          <article><span>Live products</span><b>{stats.productsActive}</b><small>{stats.productsHidden} hidden / out of stock</small></article>
        </div>
        <div className="metrics">
          <article><span>Customers</span><b>{stats.users.CUSTOMER ?? 0}</b><small>{stats.users.RESELLER ?? 0} reseller(s) · {stats.users.SELLER ?? 0} seller(s)</small></article>
          <article><span>Open tickets</span><b>{stats.ticketsOpen}</b><small>Support queue</small></article>
          <article><span>Reseller applications</span><b>{stats.resellersPending}</b><small>Awaiting review</small></article>
          <article><span>Payout requests</span><b>{stats.payoutsPending}</b><small>Awaiting payment</small></article>
        </div>
        <div className="orders">
          <div className="ordersHead"><h2>Recent orders</h2><Link href="/admin/orders">View all →</Link></div>
          {stats.recentOrders.length === 0 && <p className="adminEmpty">No orders yet. Orders appear here in real time as customers check out.</p>}
          {stats.recentOrders.map(o => <div className="orderRow" key={o.id}>
            <div><b>{o.id}</b><small>{o.firstItem}{o.itemCount > 1 ? ` +${o.itemCount - 1} more` : ''}</small></div>
            <span>{o.customerPhone}</span>
            <strong>GH₵{o.total.toFixed(2)}</strong>
            <em className={`badge ${o.status.toLowerCase()}`}>{o.status.replaceAll('_', ' ')}</em>
          </div>)}
        </div>
      </>}
    </section>
  </main>;
}
