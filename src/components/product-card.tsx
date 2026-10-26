import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/db';
import { displayName, inr, percentOff } from '@/lib/format';
import { AddToCartButton } from './add-to-cart';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const off = percentOff(product.price, product.mrp);
  const soldOut = product.stock === 0;
  const href = `/p/${product.slug}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <Link href={href} className="relative block aspect-square bg-sand">
        {product.images[0] && (
          <Image src={product.images[0]} alt={displayName(product.name)} fill sizes="(min-width:1024px) 25vw, 50vw" priority={priority}
            className="object-contain p-4 mix-blend-multiply transition duration-500 group-hover:scale-105" />
        )}
        {off > 0 && !soldOut && <span className="absolute left-3 top-3 rounded-md bg-ink px-2 py-1 text-[11px] font-bold text-brand-400">{off}% OFF</span>}
        {soldOut && <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold">Sold out</span>}
        {!soldOut && product.stock !== null && product.stock <= 5 && (
          <span className="absolute right-3 top-3 rounded-md bg-brand-100 px-2 py-1 text-[11px] font-semibold text-brand-700">Only {product.stock} left</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{product.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug"><Link href={href} className="hover:underline">{displayName(product.name)}</Link></h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p>
            <span className="text-lg font-bold">{inr(product.price)}</span>
            {off > 0 && <span className="ml-1.5 text-xs text-ink-muted line-through">{inr(product.mrp)}</span>}
          </p>
          <AddToCartButton compact product={{ productId: product.id, name: product.name, slug: product.slug, image: product.images[0] ?? '', price: product.price, brand: product.brand }} disabled={soldOut} />
        </div>
      </div>
    </article>
  );
}
