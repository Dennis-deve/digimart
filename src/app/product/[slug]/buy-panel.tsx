'use client';

import { useState } from 'react';

export default function BuyPanel({ productId, digital, resellerSlug, service }: { productId: string; digital: boolean; resellerSlug?: string; service?: 'afa' | 'afa-noid' }) {
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'MTN' | 'Telecel' | 'AirtelTigo'>('MTN');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [location, setLocation] = useState('');

  const buy = async () => {
    if (!/^0\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Ghana Mobile Money number.'); setNotice(''); return; }
    const metadata: Record<string, unknown> = {};
    if (service) { // 'afa' = with Ghana Card, 'afa-noid' = no ID required
      if (fullName.trim().length < 3) { setError('Enter the full name for the registration.'); return; }
      if (location.trim().length < 2) { setError('Enter the location for the registration.'); return; }
      metadata.fullName = fullName.trim(); metadata.location = location.trim();
      if (service === 'afa') {
        if (!/^GHA-\d{8,10}-\d$/i.test(idCard.trim())) { setError('Enter a valid Ghana Card number, e.g. GHA-123456789-1.'); return; }
        metadata.idCardNumber = idCard.trim().toUpperCase();
      }
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: phone, provider: network, items: [{ productId, qty: 1, metadata }], idempotencyKey: crypto.randomUUID(), resellerSlug: resellerSlug || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Checkout could not start.');
      const d = result.data;
      setNotice(`Order ${d.orderId} started — total GH₵${Number(d.total).toFixed(2)}. ${d.instructions} Do not consider this order paid until DigiMart verifies the Mobile Money payment.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout could not start.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="recipient">
    {service && <div className="afaForm">
      <label>Full name{service === 'afa' ? ' (as on Ghana Card)' : ''}<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Kwame Mensah" /></label>
      {service === 'afa' && <label>Ghana Card number<input value={idCard} onChange={e => setIdCard(e.target.value.toUpperCase())} placeholder="GHA-123456789-1" /></label>}
      <label>Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Accra" /></label>
    </div>}
    <label>Mobile Money number (payment{digital ? ' + digital delivery' : ''})<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="055 123 4567" /></label>
    <div className="networkSelect">{(['MTN', 'Telecel', 'AirtelTigo'] as const).map(n => <button type="button" key={n} className={network === n ? 'selected' : ''} onClick={() => setNetwork(n)}>{n}</button>)}</div>
    <button onClick={buy} disabled={busy}>{busy ? 'Starting secure payment…' : 'Buy now →'}</button>
    {notice && <p className="orderNotice">{notice}</p>}
    {error && <p className="authError" style={{ textAlign: 'left' }}>{error}</p>}
  </div>;
}
