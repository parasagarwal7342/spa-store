import type { Metadata } from 'next';
import Link from 'next/link';
import { X } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { brandFromSlug, listCategories, listProducts, type SortKey } from '@/lib/catalog';
import { BRANDS } from '@/lib/site';
import { ShopControls } from './shop-controls';

type Search = { q?: string; brand?: string; category?: string; sort?: string; instock?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams;
  const brand = brandFromSlug(sp.brand);
  const title = [brand, sp.category].filter(Boolean).join(' ') || 'Shop all products';
  return {
    title,
    description: `Buy original ${brand ?? 'National Geographic bags and Shraddha jewellery'}${sp.category ? ` – ${sp.category}` : ''} from the authorised distributor in Delhi. COD available.`,
    alternates: { canonical: `/shop${sp.brand ? `?brand=${sp.brand}` : ''}` },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const sort = (['featured', 'price-asc', 'price-desc', 'discount', 'newest'].includes(sp.sort ?? '') ? sp.sort : 'featured') as SortKey;
  const [items, categories] = await Promise.all([
    listProducts({ q: sp.q, brand: sp.brand, category: sp.category, sort, inStock: sp.instock === '1' }),
    listCategories(sp.brand),
  ]);
  const brand = brandFromSlug(sp.brand);

  const without = (key: keyof Search) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== key && v) as [string, string][]);
    const s = next.toString();
    return `/shop${s ? `?${s}` : ''}`;
  };
  const chips = [
    sp.q && { label: `“${sp.q}”`, href: without('q') },
    brand && { label: brand, href: without('brand') },
    sp.category && { label: sp.category, href: without('category') },
    sp.instock === '1' && { label: 'In stock', href: without('instock') },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="container-x py-8 lg:py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{brand ?? 'Shop'}{sp.category ? ` · ${sp.category}` : ''}</h1>
        <p className="mt-1 text-ink-soft">Original products from the authorised distributor, shipped from Delhi.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="label">Brand</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <Link href={without('brand')} className={`rounded-lg px-3 py-2 text-sm ${!brand ? 'bg-ink text-white' : 'bg-sand hover:bg-line'}`}>All brands</Link>
              {BRANDS.map((b) => (
                <Link key={b.slug} href={`/shop?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), brand: b.slug })}`}
                  className={`rounded-lg px-3 py-2 text-sm ${brand === b.name ? 'bg-ink text-white' : 'bg-sand hover:bg-line'}`}>{b.name}</Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="label">Category</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {categories.map((c) => {
                const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
                params.set('category', c.category);
                return (
                  <Link key={c.category} href={`/shop?${params}`} className={`flex justify-between gap-3 rounded-lg px-3 py-2 text-sm ${sp.category === c.category ? 'bg-ink text-white' : 'bg-sand hover:bg-line'}`}>
                    {c.category} <span className="opacity-60">{c.count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden rounded-2xl bg-ink p-5 text-white lg:block">
            <p className="mb-1 font-semibold">Buying 10 or more?</p>
            <p className="mb-3 text-sm text-white/70">Wholesale prices for gifting and resale.</p>
            <Link href="/bulk-orders" className="text-sm font-semibold text-brand-400 hover:underline">Get a bulk quote →</Link>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-muted">{items.length} product{items.length === 1 ? '' : 's'}</span>
              {chips.map((c) => (
                <Link key={c.label} href={c.href} className="inline-flex items-center gap-1 rounded-full border border-line bg-sand px-3 py-1 text-xs font-medium hover:border-ink">{c.label} <X size={12} /></Link>
              ))}
            </div>
            <ShopControls sort={sort} inStock={sp.instock === '1'} />
          </div>
          {items.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="mb-2 font-semibold">No products match your search.</p>
              <p className="mb-6 text-sm text-ink-soft">Try a different word, or ask us on WhatsApp – we may have it in stock.</p>
              <Link href="/shop" className="btn-dark">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
