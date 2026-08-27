'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type ProductData = { id: string; name: string; description: string | null; network: string | null; category: string; source: string; basePrice: number; images: string[]; inStock: boolean; isExcluded: boolean; sellerId: string | null };

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<ProductData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sellers, setSellers] = useState<{ id: string; storeName: string }[]>([]);
  const [sellerId, setSellerId] = useState('');

  useEffect(() => {
    fetch(`/api/admin/products/${id}`).then(res => res.json()).then(d => { if (d.status === 'success') { setP(d.data); setImageUrl(d.data.images[0] ?? ''); setSellerId(d.data.sellerId ?? ''); } else setError(d.message ?? 'Product not found.'); }).catch(() => setError('Could not load product.'));
    fetch('/api/admin/sellers').then(res => res.json()).then(d => { if (Array.isArray(d.data)) setSellers(d.data.filter((s: { approved: boolean }) => s.approved)); }).catch(() => undefined);
  }, [id]);

  const upload = async (file: File) => {
    setUploading(true); setError('');
    try {
      const form = new FormData(); form.append('image', file);
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? 'Upload failed.');
      setImageUrl(d.data.url); setNotice('Image uploaded to Cloudinary.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!p) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const body: Record<string, unknown> = { name: p.name, category: p.category, basePrice: p.basePrice, inStock: p.inStock, description: p.description ?? undefined, images: imageUrl ? [imageUrl] : [] };
      if (p.source === 'ADMIN' || p.network) body.network = p.network ?? undefined;
      if (p.source === 'ADMIN') body.sellerId = sellerId || undefined;
      const res = await fetch(`/api/admin/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setNotice('Product updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Update failed.'); }
    finally { setBusy(false); }
  };

  return <main className="productAdmin">
    <header><div><p>ADMIN / CATALOG</p><h1>Edit product</h1></div><Link href="/admin/products">← Back to products</Link></header>
    {notice && <p className="adminNotice ok">{notice}</p>}
    {error && <p className="adminNotice err">{error}</p>}
    {!p ? <p className="adminEmpty">{error || 'Loading…'}</p> : <section className="catalogTable">
      <form onSubmit={save} className="productForm">
        <label className="fieldFull">Product ID<small style={{ fontWeight: 400, color: '#68758a' }}>{p.id} · source: {p.source}{p.network ? ` · ${p.network}` : ''}</small></label>
        <label className="fieldFull">Name<input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} required /></label>
        <label>Category<input value={p.category} onChange={e => setP({ ...p, category: e.target.value })} required /></label>
        <label>Base price (GH₵)<input value={p.basePrice} onChange={e => setP({ ...p, basePrice: Number(e.target.value) })} type="number" min="0.01" step="0.01" required /></label>
        {p.network && <label>Network<input value={p.network} onChange={e => setP({ ...p, network: e.target.value })} /></label>}
        <label className="checkboxRow"><input type="checkbox" checked={p.inStock} onChange={e => setP({ ...p, inStock: e.target.checked })} /> In stock (visible in store)</label>
        <label className="fieldFull">Description<textarea value={p.description ?? ''} onChange={e => setP({ ...p, description: e.target.value })} rows={3} /></label>
        <label className="fieldFull">Image URL<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} type="url" placeholder="https://res.cloudinary.com/…" /></label>
        <label className="fieldFull">…or upload to Cloudinary<input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />{uploading && <small>Uploading…</small>}</label>
        {p.source === 'ADMIN' && sellers.length > 0 && <label className="fieldFull">Fulfilled by seller<select value={sellerId} onChange={e => setSellerId(e.target.value)}><option value="">DigiMart (no seller)</option>{sellers.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select></label>}
        <button className="fieldFull" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </section>}
  </main>;
}
