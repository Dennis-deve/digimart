'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AdminProduct = { id: string; name: string; source: 'BUNDLESHOPGH' | 'MUVIIN' | 'ADMIN' | 'REFER2BUNDLE'; network: string | null; category: string; basePrice: number; inStock: boolean; isExcluded: boolean; images: string[]; description: string | null; orderCount: number };

const iconFor = (p: AdminProduct) => {
  const c = `${p.category} ${p.name}`.toLowerCase();
  if (/data bundle/.test(c)) return '📶';
  if (/airtime/.test(c)) return '📞';
  if (/stream|netflix|spotify|subscription/.test(c)) return '▶';
  if (/result|checker|bece|wassce/.test(c)) return '🎓';
  if (/electronic|tech|charger|power|phone|earbud/.test(c)) return '🎧';
  if (/grocer|rice|food/.test(c)) return '🛒';
  if (/service|repair/.test(c)) return '🧰';
  return '🛍️';
};
const sourceName = (s: AdminProduct['source']) => s === 'BUNDLESHOPGH' ? 'BundleShopGH' : s === 'MUVIIN' ? 'Muviin' : s === 'REFER2BUNDLE' ? 'Refer2Bundle' : 'DigiMart';
const kindOf = (p: AdminProduct) => p.source === 'BUNDLESHOPGH' || p.source === 'REFER2BUNDLE' ? 'Data bundle' : p.source === 'MUVIIN' ? 'Digital' : p.category === 'Services' ? 'Service' : 'Physical';

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = () => fetch('/api/admin/products').then(r => r.json()).then(r => { if (r.status === 'success') setProducts(r.data); else setError(r.message ?? 'Could not load products.'); }).catch(() => setError('Could not load products.'));
  useEffect(() => { load(); }, []);

  const flash = (msg: string, err = false) => { if (err) setError(msg); else setNotice(msg); setTimeout(() => { setError(''); setNotice(''); }, 4000); };

  const toggleStock = async (p: AdminProduct) => {
    setBusyId(p.id);
    try {
      const r = await fetch(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inStock: !p.inStock }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? 'Update failed.');
      flash(`${p.name} is now ${!p.inStock ? 'in stock' : 'out of stock (hidden from the store)'}.`);
      load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Update failed.', true); }
    finally { setBusyId(''); }
  };

  const remove = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}" permanently?`)) return;
    setBusyId(p.id);
    try {
      const r = await fetch(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? 'Delete failed.');
      flash(`${p.name} deleted.`);
      load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Delete failed.', true); }
    finally { setBusyId(''); }
  };

  const stats = { total: products?.length ?? 0, active: products?.filter(p => p.inStock && !p.isExcluded).length ?? 0, hidden: products?.filter(p => !p.inStock || p.isExcluded).length ?? 0 };

  return <main className="productAdmin">
    <header>
      <div><p>ADMIN / CATALOG</p><h1>Products &amp; inventory</h1></div>
      <Link className="btnLike" href="/admin/products/new">＋ Add product</Link>
    </header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    <section className="catalogStats">
      <article><b>{stats.total}</b><span>Total products</span></article>
      <article><b>{stats.active}</b><span>Live in store</span></article>
      <article><b>{stats.hidden}</b><span>Hidden / out of stock</span></article>
    </section>
    <section className="catalogTable">
      <div className="tableHead"><span>Product</span><span>Source</span><span>Type</span><span>Price</span><span>Status</span><span /></div>
      {products === null ? <p className="adminEmpty">Loading catalog…</p>
        : products.length === 0 ? <p className="adminEmpty">No products yet. Use “Add product” to create your first one.</p>
        : products.map(p => <article key={p.id}>
          <div><i>{iconFor(p)}</i><b>{p.name}</b>{p.network && <small className="netTag">{p.network}</small>}</div>
          <span>{sourceName(p.source)}</span>
          <span>{kindOf(p)}</span>
          <strong>GH₵{p.basePrice.toFixed(2)}</strong>
          <em className={p.inStock && !p.isExcluded ? 'active' : 'outofstock'}>{p.isExcluded ? 'Excluded' : p.inStock ? 'Active' : 'Out of stock'}</em>
          <div className="rowActions">
            <Link className="btnLike" style={{ padding: '8px 11px', fontSize: 12 }} href={`/admin/products/${p.id}/edit`}>Edit</Link>
            <button disabled={busyId === p.id} onClick={() => toggleStock(p)} title={p.inStock ? 'Hide from store' : 'Show in store'}>{p.inStock ? 'Hide' : 'Show'}</button>
            <button className="danger" disabled={busyId === p.id} onClick={() => remove(p)} title={p.orderCount > 0 ? 'Has orders — cannot delete' : 'Delete'}>Delete</button>
          </div>
        </article>)}
    </section>
  </main>;
}
