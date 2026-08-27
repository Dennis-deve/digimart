'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Me = { id: string; phone: string; role: string; email: string | null; memberSince: string | null };
type Order = { id: string; status: string; total: number; createdAt: string; itemCount: number; items: string[] };

const dashboards: Record<string, { href: string; label: string }> = {
  ADMIN: { href: '/admin', label: 'Admin control center' },
  SELLER: { href: '/seller', label: 'Seller center — orders & payouts' },
  RESELLER: { href: '/reseller', label: 'Reseller store — markup & payouts' },
  RIDER: { href: '/rider', label: 'Rider center — deliveries' },
};

export default function Account() {
  const r = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.ok ? res.json() : null).then(d => { if (d?.data) setMe(d.data); else setError('Could not load your profile.'); }).catch(() => setError('Could not load your profile.'));
    fetch('/api/orders/my').then(res => res.ok ? res.json() : null).then(d => setOrders(d?.data ?? [])).catch(() => setOrders([]));
  }, []);

  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined); r.push('/'); r.refresh(); };

  return <main className="productAdmin">
    <header><div><p>MY ACCOUNT</p><h1>{me ? `0${me.phone}`.slice(-10) : 'Account'}</h1></div><button className="btnLike" onClick={signOut}>Sign out</button></header>
    {error && <p className="adminNotice err">{error} <Link href="/sign-in?next=/account">Sign in</Link></p>}
    {me && <>
      <section className="catalogStats">
        <article><b>{me.role}</b><span>Account role{me.memberSince ? ` · member since ${new Date(me.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}</span></article>
        <article><b>{me.email ?? '—'}</b><span>Email {me.email ? '(from Google or sign-up)' : '(not set)'}</span></article>
        <article><b>{orders?.length ?? 0}</b><span>Orders placed</span></article>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 10px' }}>Your DigiMart places</h2>
        <div className="productForm">
          <Link className="btnLike" href="/orders">◴ My orders &amp; tracking</Link>
          <Link className="btnLike" href="/wallet">◉ Wallet &amp; refunds</Link>
          <Link className="btnLike" href="/notifications">♧ Notifications</Link>
          <Link className="btnLike" href="/support">💬 Support conversations</Link>
          {dashboards[me.role] && <Link className="btnLike" style={{ background: '#1647a6' }} href={dashboards[me.role].href}>{dashboards[me.role].label}</Link>}
          {me.role === 'CUSTOMER' && <>
            <Link className="btnLike" href="/reseller">🏪 Become a reseller</Link>
            <Link className="btnLike" href="/seller">🛍️ Become a seller</Link>
          </>}
        </div>
      </section>
      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 10px' }}>Recent orders</h2>
        {orders === null ? <p className="adminEmpty">Loading…</p> : orders.length === 0 ? <p className="adminEmpty">No orders yet — data bundles, airtime and more are one tap away.</p> : orders.slice(0, 6).map(o => <div className="orderRow" key={o.id} style={{ gridTemplateColumns: 'minmax(130px,1.3fr) minmax(100px,1fr) auto auto' }}>
          <div><b>{o.id}</b><small>{o.items.slice(0, 2).join(', ')}{o.itemCount > 2 ? ` +${o.itemCount - 2} more` : ''}</small></div>
          <span>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <strong>GH₵{Number(o.total).toFixed(2)}</strong>
          <em className={`badge ${o.status.toLowerCase()}`}>{o.status}</em>
        </div>)}
        <p style={{ marginTop: 10 }}><Link href="/orders" style={{ color: '#1647a6', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>View all orders →</Link></p>
      </section>
    </>}
  </main>;
}
