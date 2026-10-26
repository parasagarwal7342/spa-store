import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { LeadForm } from '@/components/lead-form';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = { title: 'Contact us', description: `Call ${SITE.phone}, WhatsApp or visit SPA Enterprises in Delhi.` };

export default function ContactPage() {
  return (
    <div className="container-x py-12">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight">Contact us</h1>
      <p className="mb-10 text-ink-soft">Questions about a product, an order or a bulk requirement? We’re happy to help.</p>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <a href={SITE.phoneHref} className="btn-outline"><Phone size={16} /> Call</a>
            <a href={whatsappLink('Hi SPA Enterprise!')} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><WhatsAppIcon size={16} /> WhatsApp</a>
            <a href={`mailto:${SITE.email}`} className="btn-outline"><Mail size={16} /> Email</a>
          </div>
          <p className="text-sm text-ink-soft">{SITE.phone} · {SITE.email}</p>
          {SITE.addresses.map((a) => (
            <div key={a.label} className="card p-5">
              <h2 className="mb-2 flex items-center gap-2 font-semibold"><MapPin size={16} /> {a.label}</h2>
              <p className="text-sm text-ink-soft">{a.lines.join(', ')}</p>
            </div>
          ))}
        </div>
        <LeadForm defaultType="contact" />
      </div>
    </div>
  );
}
