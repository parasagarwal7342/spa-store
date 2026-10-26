import Image from 'next/image';
import Link from 'next/link';
import { and, asc, ilike, or, sql, type SQL } from 'drizzle-orm';
import { Plus, Search } from 'lucide-react';
import { db, products } from '@/db';
import { displayName, inr } from '@/lib/format';
import { PageTitle } from '../ui';
import { ProductRowActions, StockInput } from './client';

export const metadata = { title: 'Products' };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; stock?: string; saved?: string }> }) {
  const sp = await searchParams;
  const where: SQL[] = [];
  if (sp.q?.trim()) { const t = `%${sp.q.trim()}%`; where.push(or(ilike(products.name, t), ilike(products.sku, t), ilike(products.category, t))!); }
  if (sp.stock === 'low') where.push(sql`${products.stock} IS NOT NULL AND ${products.stock} <= 5`);
  const list = await db.select().from(products).where(and(...where)).orderBy(asc(products.brand), asc(products.category), asc(products.name));

  return (
    <>
      <PageTitle title="Products & stock" subtitle="Stock left empty = not tracked (always available). Change a number and press Enter to save.">
        <Link href="/admin/products/new" className="btn-dark"><Plus size={16} /> Add product</Link>
      </PageTitle>
      {sp.saved && <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">Product saved.</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <form className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Search name, SKU, category" className="input bg-white pl-9" />
        </form>
        <Link href={sp.stock === 'low' ? '/admin/products' : '/admin/products?stock=low'} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${sp.stock === 'low' ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>Low stock only</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand text-left text-xs text-ink-muted"><tr><th className="p-3">Product</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Shown</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'opacity-60'}>
                <td className="p-3">
                  <div className="flex min-w-[260px] items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                    <span><Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:underline">{displayName(p.name)}</Link><span className="text-xs text-ink-muted">{p.sku} · {p.brand} · {p.category}</span></span>
                  </div>
                </td>
                <td className="whitespace-nowrap p-3"><b>{inr(p.price)}</b>{p.mrp && <span className="block text-xs text-ink-muted line-through">{inr(p.mrp)}</span>}</td>
                <td className="p-3"><StockInput id={p.id} stock={p.stock} name={p.name} /></td>
                <td className="p-3 text-xs">{p.active ? 'Yes' : 'Hidden'}{p.featured && ' · ★'}</td>
                <td className="p-3"><ProductRowActions id={p.id} slug={p.slug} name={p.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
