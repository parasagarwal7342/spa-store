import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BRANDS, SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'About us', description: `${SITE.name} is an authorised distributor of National Geographic and Shraddha in Delhi.` };

export default function AboutPage() {
  return (
    <div className="container-x max-w-4xl py-12">
      <p className="eyebrow mb-3">About us</p>
      <h1 className="mb-6 text-4xl font-extrabold tracking-tight">{SITE.name}, Delhi</h1>
      <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
        <p>{SITE.name} is an authorised distributor of <b className="text-ink">National Geographic</b> bags and luggage and <b className="text-ink">Shraddha Arts &amp; Jewels</b> brass jewellery. Every product we sell is original and supplied directly through official channels.</p>
        <p>We serve shoppers across India through this website, and businesses through bulk and corporate-gifting orders, from our offices in Karala and Najafgarh, Delhi.</p>
        <p>We are a registered MSME ({SITE.udyam}) with GSTIN {SITE.gstin}, so every order comes with a proper tax invoice.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {BRANDS.map((b) => (
          <Link key={b.slug} href={`/shop?brand=${b.slug}`} className="card p-6 hover:border-ink">
            <Image src={b.logo} alt={`${b.name} logo`} width={140} height={48} className="mb-4 h-10 w-auto object-contain" />
            <h2 className="mb-1 font-bold">{b.name}</h2>
            <p className="text-sm text-ink-soft">{b.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
