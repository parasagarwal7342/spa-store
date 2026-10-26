import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Building2, ChevronRight, RotateCcw, Truck } from 'lucide-react';
import { BuyBox } from '@/components/add-to-cart';
import { ProductCard } from '@/components/product-card';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { getProductBySlug, relatedProducts } from '@/lib/catalog';
import { displayName, inr, percentOff } from '@/lib/format';
import { FREE_SHIPPING_ABOVE } from '@/lib/shipping';
import { BRANDS, SITE, whatsappLink } from '@/lib/site';
import { Gallery } from './gallery';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: 'Product not found' };
  const name = displayName(p.name);
  return {
    title: `${name} – ${inr(p.price)}`,
    description: `${name}. ${p.description.slice(0, 120)} Buy original from the authorised distributor. COD available.`,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: name, images: p.images.slice(0, 1), type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const related = await relatedProducts(p);
  const name = displayName(p.name);
  const off = percentOff(p.price, p.mrp);
  const soldOut = p.stock === 0;
  const brandSlug = BRANDS.find((b) => b.name === p.brand)?.slug;
  const url = `${SITE.url}/p/${p.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name, sku: p.sku, image: p.images, description: p.description,
    brand: { '@type': 'Brand', name: p.brand },
    offers: {
      '@type': 'Offer', priceCurrency: 'INR', price: p.price, url,
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE.name },
    },
  };

  return (
    <div className="container-x py-6 lg:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link><ChevronRight size={14} />
        {brandSlug && <><Link href={`/shop?brand=${brandSlug}`} className="hover:text-ink">{p.brand}</Link><ChevronRight size={14} /></>}
        <Link href={`/shop?${new URLSearchParams({ ...(brandSlug ? { brand: brandSlug } : {}), category: p.category })}`} className="hover:text-ink">{p.category}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Gallery images={p.images} alt={name} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{p.brand}</p>
          <h1 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{name}</h1>
          <p className="mb-5 text-xs text-ink-muted">SKU {p.sku}</p>
          <div className="mb-1 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold">{inr(p.price)}</span>
            {off > 0 && <><span className="text-lg text-ink-muted line-through">{inr(p.mrp)}</span><span className="rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-brand-400">{off}% off</span></>}
          </div>
          <p className="mb-5 text-xs text-ink-muted">Inclusive of all taxes · GST invoice provided</p>
          <p className={`mb-5 text-sm font-semibold ${soldOut ? 'text-red-600' : p.stock !== null && p.stock <= 5 ? 'text-brand-700' : 'text-green-700'}`}>
            {soldOut ? 'Sold out – message us on WhatsApp and we’ll tell you when it’s back.' : p.stock !== null && p.stock <= 5 ? `Only ${p.stock} left in stock` : 'In stock · ships from Delhi'}
          </p>

          <BuyBox disabled={soldOut} maxQty={p.stock ?? 50} product={{ productId: p.id, name: p.name, slug: p.slug, image: p.images[0] ?? '', price: p.price, brand: p.brand }} />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a href={whatsappLink(`Hi, I'm interested in ${name} (${p.sku}) – ${inr(p.price)}. ${url}`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><WhatsAppIcon size={18} /> Ask on WhatsApp</a>
            <Link href={`/bulk-orders?product=${encodeURIComponent(p.sku)}`} className="btn-outline"><Building2 size={18} /> Bulk price (10+)</Link>
          </div>

          <ul className="my-8 grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-xl bg-sand px-3 py-3"><BadgeCheck size={18} className="shrink-0" /> 100% original</li>
            <li className="flex items-center gap-2 rounded-xl bg-sand px-3 py-3"><Truck size={18} className="shrink-0" /> Free above {inr(FREE_SHIPPING_ABOVE)}</li>
            <li className="flex items-center gap-2 rounded-xl bg-sand px-3 py-3"><RotateCcw size={18} className="shrink-0" /> 7-day returns</li>
          </ul>

          {p.highlights.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-semibold">Highlights</h2>
              <ul className="space-y-2 text-sm text-ink-soft">{p.highlights.map((h) => <li key={h} className="flex gap-2"><span className="text-brand-600">●</span>{h}</li>)}</ul>
            </div>
          )}
          <div>
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="h-section mb-6">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}
    </div>
  );
}
