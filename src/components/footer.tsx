import Image from 'next/image';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { SITE, whatsappLink } from '@/lib/site';
import { WhatsAppIcon } from './whatsapp-icon';

const COLUMNS = [
  { title: 'Shop', links: [['All products', '/shop'], ['National Geographic', '/shop?brand=national-geographic'], ['Shraddha jewellery', '/shop?brand=shraddha'], ['Best deals', '/shop?sort=discount']] },
  { title: 'Help', links: [['Track your order', '/track'], ['Warranty & returns', '/warranty'], ['Shipping & policies', '/policies'], ['Contact us', '/contact']] },
  { title: 'Business', links: [['Bulk & corporate orders', '/bulk-orders'], ['Become a dealer', '/bulk-orders?type=dealer'], ['About us', '/about'], ['Team sign-in', '/login?next=/admin']] },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-sand">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="mb-4 flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg border border-line bg-white object-contain" />
            <span className="text-lg font-extrabold tracking-tight">SPA <span className="text-brand-600">ENTERPRISE</span></span>
          </Link>
          <p className="mb-5 max-w-sm text-sm text-ink-soft">{SITE.tagline} in India. 100% original products, shipped from Delhi.</p>
          <ul className="space-y-2.5 text-sm text-ink-soft">
            <li><a href={SITE.phoneHref} className="flex items-center gap-2 hover:text-ink"><Phone size={15} /> {SITE.phone}</a></li>
            <li><a href={whatsappLink('Hi SPA Enterprise!')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-ink"><WhatsAppIcon size={15} /> WhatsApp us</a></li>
            <li><a href={`mailto:${SITE.email}`} className="flex items-center gap-2 hover:text-ink"><Mail size={15} /> {SITE.email}</a></li>
            <li className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0" /> {SITE.addresses[0].lines.join(', ')}</li>
          </ul>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 text-sm font-semibold">{c.title}</h2>
            <ul className="space-y-2.5 text-sm text-ink-soft">
              {c.links.map(([label, href]) => <li key={label}><Link href={href} className="hover:text-ink">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-ink-muted lg:flex-row">
          <div className="text-center lg:text-left">
            <p>© {new Date().getFullYear()} M/S {SITE.name}. {SITE.udyam}. GSTIN {SITE.gstin}.</p>
            <p className="mt-1">National Geographic and Shraddha are trademarks of their respective owners.</p>
          </div>
          <a href={SITE.builtBy.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-ink px-4 py-2.5 text-white hover:bg-ink-soft">
            <span className="block text-[9px] uppercase tracking-[0.2em] text-white/60">Built &amp; maintained by</span>
            <span className="text-sm font-extrabold uppercase tracking-[0.2em]">Paravion <span className="text-white/60">Tech</span></span>
          </a>
        </div>
      </div>
    </footer>
  );
}
