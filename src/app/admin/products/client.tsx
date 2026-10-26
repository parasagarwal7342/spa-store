'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Edit, ExternalLink, Megaphone, Trash2 } from 'lucide-react';
import { deleteProduct, setStock } from '../actions';
import { createSpotlight } from '../marketing-actions';

export function StockInput({ id, stock, name }: { id: number; stock: number | null; name: string }) {
  const [value, setValue] = useState(stock === null ? '' : String(stock));
  const [pending, start] = useTransition();
  const commit = () => {
    const next = value.trim() === '' ? null : Math.max(0, Math.floor(Number(value)));
    if (next === stock || (next !== null && Number.isNaN(next))) return;
    start(() => setStock(id, next));
  };
  const tone = stock === 0 ? 'border-red-300 bg-red-50' : stock !== null && stock <= 5 ? 'border-brand-400 bg-brand-50' : '';
  return (
    <input type="number" min={0} value={value} placeholder="—" aria-label={`Stock for ${name}`} disabled={pending}
      onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`input w-20 px-2 py-1.5 text-center ${tone}`} />
  );
}

export function ProductRowActions({ id, slug, name }: { id: number; slug: string; name: string }) {
  const [pending, start] = useTransition();
  const [queued, setQueued] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-ink-muted hover:bg-sand" title="View on website"><ExternalLink size={16} /></a>
      <button disabled={pending || queued} onClick={() => start(async () => { await createSpotlight(id); setQueued(true); })} className="rounded-lg p-2 text-ink-muted hover:bg-sand disabled:text-green-700" title={queued ? 'Social post created' : 'Create a social media post now'}><Megaphone size={16} /></button>
      <Link href={`/admin/products/${id}`} className="rounded-lg p-2 text-ink-muted hover:bg-sand" title="Edit"><Edit size={16} /></Link>
      <button disabled={pending} onClick={() => confirm(`Delete "${name}"? Past orders keep their details. To hide it instead, untick "Show on website".`) && start(() => deleteProduct(id))}
        className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-700" title="Delete"><Trash2 size={16} /></button>
    </div>
  );
}
