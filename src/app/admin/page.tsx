'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = { ordersTotal: number; ordersToday: number; grossSales: number; pendingPayments: number; failed: number; productsActive: number; productsHidden: number; users: Record<string, number>; ticketsOpen: number; resellersPending: number; payoutsPending: number; recentOrders: { id: string; createdAt: string; customerPhone: string; status: string; total: number; itemCount: number; firstItem: string }[] };
type Analytics = { series: { label: string; orders: number; revenue: number }[]; statusCounts: Record<string, number>; revenue14: number; orders14: number; topProducts: { name: string; qty: number; orders: number }[]; users7: number; pending: { sellers: number; resellers: number; riders: number } };

const NAV = [
  { label: 'Overview', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Partners', href: '/admin/partners' },
  { label: 'Coupons', href: '/admin/coupons' },
  { label: 'Payouts', href: '/admin/payouts' },
  { label: 'Refunds', href: '/admin/refunds' },
  { label: 'Support', href: '/admin/support' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Integrations', href: '/admin/integrations' },
];

const STATUS_COLORS: Record<string, string> = { PENDING: '#e0a500', PROCESSING: '#1647a6', COMPLETED: '#00a88b', FAILED: '#d64545' };

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ana, setAna] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(r => { if (r.status === 'success') setStats(r.data); else setError(r.message ?? 'Could not load stats.'); }).catch(() => setError('Could not load stats.'));
    fetch('/api/admin/analytics').then(r => r.json()).then(r => { if (r.status === 'success') setAna(r.data); }).catch(() => undefined);
  }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const maxRevenue = Math.max(1, ...(ana?.series.map(d => d.revenue) ?? [1]));
  const pendingPartners = ana ? ana.pending.sellers + ana.pending.resellers + ana.pending.riders : 0;

  return <main className="admin">
    <aside>
      <div className="logo"><span>Digi</span><b>Mart</b></div>
      <p>ADMIN CONTROL CENTER</p>
      {NAV.map(n => <Link key={n.label} href={n.href} className={n.href === '/admin' ? 'active' : ''}>{n.label}</Link>)}
      <Link href="/">← Back to store</Link>
    </aside>
    <section>
      <header><div><p>{today}</p><h1>Command center</h1></div><Link href="/admin/products/new" className="btnLike">＋ Add product</Link></header>
      {error && <p className="adminNotice err">{error}</p>}
      {!stats && !error && <p className="adminEmpty">Loading live platform data…</p>}

      {stats && <>
        <div className="adminHeroKpis">
          <article className="big"><span>Gross sales (completed)</span><b>GH₵{stats.grossSales.toFixed(2)}</b><small>{stats.ordersTotal} orders all time</small></article>
          <article><span>Orders today</span><b>{stats.ordersToday}</b><small>{stats.pendingPayments} awaiting payment</small></article>
          <article><span>Live products</span><b>{stats.productsActive}</b><small>{stats.productsHidden} hidden</small></article>
          <article><span>New users (7d)</span><b>{ana?.users7 ?? '—'}</b><small>{stats.users.CUSTOMER ?? 0} customers total</small></article>
          <article className={pendingPartners > 0 ? 'warn' : ''}><span>Awaiting approval</span><b>{pendingPartners}</b><small>sellers · resellers · riders → <Link href="/admin/partners">review</Link></small></article>
          <article className={stats.ticketsOpen > 0 ? 'warn' : ''}><span>Open tickets</span><b>{stats.ticketsOpen}</b><small>→ <Link href="/admin/support">support</Link></small></article>
        </div>

        <div className="adminChartRow">
          <div className="adminCard chart">
            <div className="chartHead"><b>Revenue — last 14 days</b><span>GH₵{(ana?.revenue14 ?? 0).toFixed(2)} · {ana?.orders14 ?? 0} orders</span></div>
            <div className="barChart">
              {(ana?.series ?? []).map((d, i) => <div className="barCol" key={i} title={`${d.label}: GH₵${d.revenue.toFixed(2)} · ${d.orders} order(s)`}>
                <div className="bar" style={{ height: `${Math.max(3, (d.revenue / maxRevenue) * 100)}%` }} />
                {i % 2 === 0 && <small>{d.label.split(' ')[0]}</small>}
              </div>)}
              {!ana && <p className="adminEmpty">Loading chart…</p>}
            </div>
          </div>
          <div className="adminCard">
            <div className="chartHead"><b>Order mix (14d)</b></div>
            <div className="statusMix">
              {Object.entries(ana?.statusCounts ?? {}).map(([s, n]) => <div key={s} className="statusRow"><i style={{ background: STATUS_COLORS[s] ?? '#8a97ac' }} /><span>{s.replaceAll('_', ' ')}</span><b>{n}</b></div>)}
              {!ana && <p className="adminEmpty">Loading…</p>}
              {ana && Object.keys(ana.statusCounts).length === 0 && <p className="adminEmpty">No orders in the last 14 days.</p>}
            </div>
            <div className="chartHead" style={{ marginTop: 14 }}><b>Top products (30d)</b></div>
            {ana?.topProducts.length ? ana.topProducts.map(p => <div className="statusRow" key={p.name}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span><b>×{p.qty}</b></div>) : <p className="adminEmpty">No sales yet.</p>}
          </div>
        </div>

        <div className="orders">
          <div className="ordersHead"><h2>Live orders</h2><Link href="/admin/orders">View all →</Link></div>
          {stats.recentOrders.length === 0 && <p className="adminEmpty">No orders yet — they appear here in real time.</p>}
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
