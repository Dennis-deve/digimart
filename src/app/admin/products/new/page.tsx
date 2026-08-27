'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Source = 'ADMIN' | 'BUNDLESHOPGH' | 'MUVIIN' | 'REFER2BUNDLE';

const NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'] as const;
const CATEGORIES: Record<Source, string[]> = {
  BUNDLESHOPGH: ['Data Bundles', 'AFA Registration', 'AFA Registration (No ID)'],
  REFER2BUNDLE: ['Data Bundles', 'AFA Registration'], // No-ID AFA not possible via their API (Ghana Card required)
  MUVIIN: ['Airtime', 'Result Checkers', 'Streaming & Subscriptions', 'Bills & Utilities', 'AFA Registration', 'AFA Registration (No ID)', 'Other Digital'],
  ADMIN: ['Electronics', 'Groceries', 'Fashion', 'Home & Essentials', 'Beauty & Personal Care', 'Services', 'Other'],
};
const SOURCE_INFO: Record<Source, string> = {
  BUNDLESHOPGH: 'Data bundles ONLY. Size (e.g. 10GB) must be in the name — fulfilment reads it from there.',
  REFER2BUNDLE: 'Data bundles (size in name, e.g. 1GB/500MB) and AFA registration packages (buyer details captured at checkout).',
  MUVIIN: 'Airtime, result checkers and selected digital services. Data bundles are NOT allowed here.',
  ADMIN: 'Your own physical products, groceries and services. Uses DigiMart delivery zones at checkout.',
};

export default function NewProduct() {
  const r = useRouter();
  const [source, setSource] = useState<Source>('ADMIN');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES.ADMIN[0]);
  const [network, setNetwork] = useState<string>('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [sellerId, setSellerId] = useState('');
  const [sellers, setSellers] = useState<{ id: string; storeName: string }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch('/api/admin/sellers').then(r => r.json()).then(r => { if (Array.isArray(r.data)) setSellers(r.data.filter((s: { approved: boolean }) => s.approved)); }).catch(() => undefined); }, []);

  const pickSource = (s: Source) => { setSource(s); setCategory(CATEGORIES[s][0]); setNetwork(''); setError(''); };
  const needsNetwork = source === 'BUNDLESHOPGH' || (source === 'REFER2BUNDLE' && category === 'Data Bundles') || (source === 'MUVIIN' && category === 'Airtime');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (needsNetwork && !network) return setError('Select the network for this product.');
    if ((source === 'BUNDLESHOPGH' || (source === 'REFER2BUNDLE' && category === 'Data Bundles')) && !/(\d+(?:\.\d+)?)\s*(GB|MB)/i.test(name)) return setError('Data bundle names must include the size, e.g. "MTN 10GB Data Bundle" or "AirtelTigo 500MB".');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, basePrice: Number(price), source, stock: inStock, network: network || undefined, description: description || undefined, images: imageUrl ? [imageUrl] : [], sellerId: sellerId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message ?? 'Could not create product.');
      r.push('/admin/products');
    } catch { setError('Could not create product.'); }
    finally { setBusy(false); }
  };

  return <main className="productAdmin">
    <header><div><p>ADMIN / CATALOG</p><h1>Add product</h1></div><Link href="/admin/products">← Back to products</Link></header>
    <section className="catalogTable">
      <form onSubmit={submit} className="productForm">
        <label className="fieldFull"><b>Provider / source</b>
          <div className="sourcePicker">
            {(['ADMIN', 'BUNDLESHOPGH', 'REFER2BUNDLE', 'MUVIIN'] as Source[]).map(s => <button type="button" key={s} className={source === s ? 'selected' : ''} onClick={() => pickSource(s)}>
              {s === 'ADMIN' ? '🛍️ DigiMart (own product)' : s === 'BUNDLESHOPGH' ? '📶 BundleShopGH (data bundles)' : s === 'REFER2BUNDLE' ? '📡 Refer2Bundle (data bundles)' : '📞 Muviin (airtime & digital)'}
            </button>)}
          </div>
          <small className="hint">{SOURCE_INFO[source]}</small>
        </label>
        <label>Product name<input value={name} onChange={e => setName(e.target.value)} required placeholder={source === 'BUNDLESHOPGH' ? 'e.g. MTN 10GB Data Bundle' : source === 'MUVIIN' ? 'e.g. MTN Airtime GH₵10' : 'e.g. Oraimo Wireless Earbuds'}/></label>
        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)} disabled={source === 'BUNDLESHOPGH'}>
            {CATEGORIES[source].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {needsNetwork && <label>Network
          <select value={network} onChange={e => setNetwork(e.target.value)} required>
            <option value="">Select network…</option>
            {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>}
        <label>Base price (GH₵)<input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0.01" step="0.01" required placeholder={source === 'MUVIIN' && category === 'Airtime' ? 'Face value, e.g. 10' : 'e.g. 43'}/></label>
        <label className="fieldFull">Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short description shown on the product page (optional)"/></label>
        <label className="fieldFull">Image URL (optional — Cloudinary or any public link)<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} type="url" placeholder="https://res.cloudinary.com/…"/></label>
        {source === 'ADMIN' && sellers.length > 0 && <label className="fieldFull">Fulfilled by seller (optional — orders credit this seller&apos;s earnings)<select value={sellerId} onChange={e => setSellerId(e.target.value)}><option value="">DigiMart (no seller)</option>{sellers.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select></label>}
        <label className="checkboxRow"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)}/> Available in store immediately</label>
        {error && <p className="formError">{error}</p>}
        <button className="fieldFull" disabled={busy}>{busy ? 'Creating…' : 'Create product'}</button>
      </form>
    </section>
  </main>;
}
