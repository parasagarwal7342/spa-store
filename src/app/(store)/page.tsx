import Image from 'next/image';
import Link from 'next/link';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { ArrowRight, BadgeCheck, Banknote, Building2, Gift, RotateCcw, Truck } from 'lucide-react';
import { db, products } from '@/db';
import { ProductCard } from '@/components/product-card';
import { BRANDS, SITE, whatsappLink } from '@/lib/site';
import { FREE_SHIPPING_ABOVE } from '@/lib/shipping';
import { inr } from '@/lib/format';
import { WhatsAppIcon } from '@/components/whatsapp-icon';

export const revalidate = 300;

export default async function HomePage() {
  const inStock = sql`(${products.stock} IS NULL OR ${products.stock} > 0)`;
  const [featured, deals, heroProduct] = await Promise.all([
    db.select().from(products).where(and(eq(products.active, true), eq(products.featured, true), inStock)).limit(8),
    db.select().from(products).where(and(eq(products.active, true), gt(products.mrp, products.price), inStock))
      .orderBy(desc(sql`(${products.mrp} - ${products.price})::float / ${products.mrp}`)).limit(4),
    db.select().from(products).where(and(eq(products.active, true), eq(products.category, 'Suitcase'), inStock)).limit(1),
  ]);
  const hero = heroProduct[0] ?? featured[0];

  return (
    <>
      <section className="border-b border-line bg-sand">
        <div className="container-x grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="eyebrow mb-4">{SITE.tagline}</p>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Original gear for every journey. <span className="text-brand-600">Craft for every occasion.</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg text-ink-soft">
              National Geographic backpacks, sling bags and suitcases, and handcrafted Shraddha brass jewellery – shipped straight from our Delhi warehouse.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="btn-dark px-7 py-3.5 text-base">Shop now <ArrowRight size={18} /></Link>
              <Link href="/bulk-orders" className="btn-outline px-7 py-3.5 text-base"><Gift size={18} /> Corporate gifting</Link>
            </div>
          </div>
          {hero && (
            <Link href={`/p/${hero.slug}`} className="relative mx-auto block aspect-square w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-black/5">
              <Image src={hero.images[0]} alt="" fill priority sizes="(min-width:1024px) 450px, 90vw" className="object-contain p-10" />
              <span className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm text-white">
                <span className="line-clamp-1 pr-3">{hero.brand} · {hero.category}</span>
                <span className="shrink-0 font-bold text-brand-400">from {inr(hero.price)}</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <section className="border-b border-line">
        <ul className="container-x grid grid-cols-2 gap-6 py-6 text-sm lg:grid-cols-4">
          {[
            { icon: Truck, t: 'Free delivery', d: `Delhi NCR, and India above ${inr(FREE_SHIPPING_ABOVE)}` },
            { icon: Banknote, t: 'Cash on Delivery', d: 'Or pay by UPI & cards' },
            { icon: BadgeCheck, t: 'Authorised distributor', d: '100% original products' },
            { icon: RotateCcw, t: '7-day returns', d: 'Unused items in original packing' },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ink"><Icon size={18} /></span>
              <span><span className="block font-semibold">{t}</span><span className="text-ink-muted">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-x py-16">
        <div className="mb-8 flex items-end justify-between">
          <div><p className="eyebrow mb-2">Best sellers</p><h2 className="h-section">Popular right now</h2></div>
          <Link href="/shop" className="hidden items-center gap-1 text-sm font-semibold hover:underline sm:flex">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{featured.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}</div>
      </section>

      <section className="container-x grid gap-5 md:grid-cols-2">
        {BRANDS.map((b, i) => (
          <Link key={b.slug} href={`/shop?brand=${b.slug}`} className={`group relative overflow-hidden rounded-[2rem] p-8 sm:p-10 ${i === 0 ? 'bg-ink text-white' : 'bg-brand-100'}`}>
            <Image src={b.logo} alt={`${b.name} logo`} width={160} height={56} className={`mb-10 h-12 w-auto rounded-md object-contain ${i === 0 ? 'bg-white p-1.5' : ''}`} />
            <h3 className="mb-2 text-2xl font-bold sm:text-3xl">{b.name}</h3>
            <p className={`mb-6 max-w-sm ${i === 0 ? 'text-white/75' : 'text-ink-soft'}`}>{b.blurb}</p>
            <span className="inline-flex items-center gap-2 font-semibold">Shop {b.name} <ArrowRight size={18} className="transition group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>

      {deals.length > 0 && (
        <section className="container-x py-16">
          <div className="mb-8 flex items-end justify-between">
            <div><p className="eyebrow mb-2">Deals</p><h2 className="h-section">Biggest savings today</h2></div>
            <Link href="/shop?sort=discount" className="hidden items-center gap-1 text-sm font-semibold hover:underline sm:flex">All deals <ArrowRight size={16} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{deals.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      <section className="container-x">
        <div className="grid items-center gap-8 rounded-[2rem] bg-ink p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-400"><Building2 size={16} /> For businesses</p>
            <h2 className="mb-3 text-3xl font-bold">Bulk orders &amp; corporate gifting</h2>
            <p className="text-white/75">Wholesale prices on original National Geographic and Shraddha products for Diwali gifts, employee kits, events and retailers – with GST invoice and pan-India delivery.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/bulk-orders" className="btn-primary py-3.5">Get a bulk quote</Link>
            <a href={whatsappLink('Hi SPA Enterprise, I need a bulk / corporate quote.')} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-3.5"><WhatsAppIcon size={18} /> WhatsApp the team</a>
          </div>
        </div>
      </section>
    </>
  );
}
