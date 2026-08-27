'use client';

import { useCallback, useEffect, useState } from 'react';

type Review = { id: string; rating: number; comment: string | null; createdAt: string; reviewer: string };

export default function ReviewPanel({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(() => { fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`).then(r => r.json()).then(r => { if (r.status === 'success') setReviews(r.data); }).catch(() => setReviews([])); }, [productId]);
  useEffect(() => { load(); fetch('/api/auth/me').then(r => setSignedIn(r.ok)).catch(() => undefined); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, rating, comment: comment || undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? 'Could not submit review.');
      setNotice('Thank you — your review is published.'); setComment(''); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit review.'); }
    finally { setBusy(false); }
  };

  const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return <section className="reviewsSection">
    <h2>Reviews {reviews && reviews.length > 0 && <span>★ {avg.toFixed(1)} · {reviews.length} review{reviews.length > 1 ? 's' : ''}</span>}</h2>
    {reviews === null ? <p className="adminEmpty">Loading reviews…</p> : reviews.length === 0 ? <p className="adminEmpty">No reviews yet — be the first to review this product.</p> :
      reviews.map(r => <article key={r.id} className="reviewItem">
        <b>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</b>
        {r.comment && <p>{r.comment}</p>}
        <small>{r.reviewer} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
      </article>)}
    {signedIn ? <form onSubmit={submit} className="reviewForm">
      <label>Your rating<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)} ({n}/5)</option>)}</select></label>
      <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience (optional)" />
      <button disabled={busy}>{busy ? 'Publishing…' : 'Publish review'}</button>
      {notice && <p className="adminNotice ok">{notice}</p>}
      {error && <p className="adminNotice err">{error}</p>}
    </form> : <p className="adminEmpty"><a href="/sign-in">Sign in</a> to leave a review.</p>}
  </section>;
}
