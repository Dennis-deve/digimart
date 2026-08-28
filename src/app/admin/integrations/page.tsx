'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Integrations = {
  moolreCallback: string;
  bundleshopghNote: string;
  crons: { name: string; schedule: string; command: string }[];
  health: Record<string, boolean>;
};

const HEALTH_LABELS: Record<string, string> = { moolrePayments: 'Moolre payments (collections)', moolreTransfers: 'Moolre transfers (auto-payouts)', moolreSms: 'Moolre SMS notifications', bundleshopgh: 'BundleShopGH data', muviin: 'Muviin airtime/checkers', refer2bundle: 'Refer2Bundle data/AFA', cloudinary: 'Cloudinary images/banners', push: 'Web push notifications', google: 'Google sign-in' };

export default function AdminIntegrations() {
  const [data, setData] = useState<Integrations | null>(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/admin/integrations').then(r => r.json()).then(d => { if (d.status === 'success') setData(d.data); else setError(d.message ?? 'Could not load.'); }).catch(() => setError('Could not load.')); }, []);
  const copy = async (text: string, id: string) => { await navigator.clipboard?.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 2000); };

  return <main className="productAdmin">
    <header><div><p>ADMIN / INTEGRATIONS</p><h1>Integrations &amp; callbacks</h1></div><Link href="/admin" className="btnLike">← Overview</Link></header>
    {error && <p className="adminNotice err">{error}</p>}
    {!data && !error && <p className="adminEmpty">Loading…</p>}
    {data && <>
      <section className="catalogTable">
        <h2 style={{ margin: '0 0 6px' }}>🔗 Moolre payment callback — paste this into the Moolre portal</h2>
        <p className="adminEmpty">Moolre portal → API/Webhook settings → paste this exact URL. Payments confirm automatically when Moolre calls it.</p>
        <div className="copyRow"><code>{data.moolreCallback}</code><button onClick={() => copy(data.moolreCallback, 'moolre')}>{copied === 'moolre' ? '✓ Copied' : 'Copy'}</button></div>
        <p className="adminEmpty" style={{ marginTop: 10 }}>{data.bundleshopghNote}</p>
      </section>

      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 6px' }}>⏰ Cron jobs — paste into Railway (Settings → Cron Jobs)</h2>
        {data.crons.map(c => <div key={c.name} style={{ borderTop: '1px solid #e6ebf4', padding: '10px 0' }}>
          <b style={{ fontSize: 13 }}>{c.name}</b> <small style={{ color: '#68758a' }}>— schedule: <code>{c.schedule}</code></small>
          <div className="copyRow"><code>{c.command}</code><button onClick={() => copy(c.command, c.name)}>{copied === c.name ? '✓ Copied' : 'Copy'}</button></div>
        </div>)}
      </section>

      <section className="catalogTable" style={{ marginTop: 15 }}>
        <h2 style={{ margin: '0 0 8px' }}>💚 Configuration health</h2>
        {Object.entries(data.health).map(([k, ok]) => <div className="statusRow" key={k} style={{ borderTop: '1px solid #eef2f9', padding: '9px 0' }}>
          <i style={{ background: ok ? '#00a88b' : '#d64545', width: 9, height: 9, borderRadius: '50%' }} />
          <span>{HEALTH_LABELS[k] ?? k}</span>
          <b style={{ color: ok ? '#00836f' : '#a11c1c', fontSize: 11 }}>{ok ? 'CONFIGURED' : 'NOT SET'}</b>
        </div>)}
        <p className="adminEmpty">Missing something? Add the variable in Railway → Variables (see ENV_SETUP_GUIDE.md), then redeploy.</p>
      </section>
    </>}
  </main>;
}
