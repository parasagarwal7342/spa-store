'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SORTS = [
  ['featured', 'Featured'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['discount', 'Biggest discount'], ['newest', 'Newest'],
] as const;

export function ShopControls({ sort, inStock }: { sort: string; inStock: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <div className="flex items-center gap-4 text-sm">
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={inStock} onChange={(e) => set('instock', e.target.checked ? '1' : null)} className="h-4 w-4 accent-ink" /> In stock
      </label>
      <select value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? null : e.target.value)} className="input w-auto py-2" aria-label="Sort products">
        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
