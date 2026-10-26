import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Phone } from 'lucide-react';
import { db, leads, products } from '@/db';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { displayName, formatDateTime, toWhatsAppNumber } from '@/lib/format';
import { whatsappLink } from '@/lib/site';
import { PageTitle } from '../ui';
import { LeadControls } from './controls';

export const metadata = { title: 'Leads' };
const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
const TYPE = { bulk: 'Bulk quote', dealer: 'Dealer', contact: 'Message', warranty: 'Warranty/return' } as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? 'new';
  const list = await db.select({ lead: leads, productName: products.name }).from(leads)
    .leftJoin(products, eq(products.sku, leads.productSku))
    .where(status === 'all' ? undefined : eq(leads.status, status as (typeof STATUSES)[number]))
    .orderBy(desc(leads.createdAt)).limit(300);

  return (
    <>
      <PageTitle title="Leads" subtitle="Bulk quotes, dealer enquiries, messages and warranty requests." />
      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {[...STATUSES, 'all'].map((s) => <Link key={s} href={`/admin/leads?status=${s}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{s}</Link>)}
      </div>
      {list.length === 0 ? <p className="card p-10 text-center text-ink-muted">Nothing here.</p> : (
        <div className="space-y-3">
          {list.map(({ lead: l, productName }) => (
            <article key={l.id} className="card grid gap-4 p-4 md:grid-cols-[1fr_260px]">
              <div className="space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-[11px] font-bold uppercase">{TYPE[l.type]}</span>
                  <b>{l.name}</b>{l.company && <span className="text-ink-soft">· {l.company}</span>}{l.city && <span className="text-ink-soft">· {l.city}</span>}
                  <span className="ml-auto text-xs text-ink-muted">{formatDateTime(l.createdAt)}</span>
                </div>
                {(productName || l.quantity) && <p>{productName ? displayName(productName) : 'Mixed products'}{l.quantity ? ` · qty ${l.quantity}` : ''}</p>}
                {l.orderNumber && <p>Order: {l.orderNumber}</p>}
                {l.message && <p className="whitespace-pre-line text-ink-soft">{l.message}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={`tel:${l.phone}`} className="btn-outline px-3 py-1.5"><Phone size={14} /> {l.phone}</a>
                  <a href={whatsappLink(`Hi ${l.name.split(' ')[0]}, this is SPA Enterprise about your ${TYPE[l.type].toLowerCase()} request.`, toWhatsAppNumber(l.phone))} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-3 py-1.5"><WhatsAppIcon size={14} /> WhatsApp</a>
                  {l.email && <a href={`mailto:${l.email}`} className="btn-outline px-3 py-1.5">Email</a>}
                </div>
              </div>
              <LeadControls id={l.id} status={l.status} notes={l.notes ?? ''} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
