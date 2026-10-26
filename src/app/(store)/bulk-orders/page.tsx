import type { Metadata } from 'next';
import { asc, eq } from 'drizzle-orm';
import { Building2, Gift, Receipt, Store, Truck } from 'lucide-react';
import { db, products } from '@/db';
import { LeadForm } from '@/components/lead-form';
import { displayName, inr } from '@/lib/format';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Bulk Orders & Corporate Gifting',
  description: 'Wholesale prices on original National Geographic bags and Shraddha brass jewellery for corporate gifts, events, retailers and resellers. GST invoice, pan-India delivery.',
};

export default async function BulkOrdersPage({ searchParams }: { searchParams: Promise<{ product?: string; type?: string }> }) {
  const sp = await searchParams;
  const list = await db.select({ sku: products.sku, name: products.name, price: products.price }).from(products).where(eq(products.active, true)).orderBy(asc(products.brand), asc(products.name));
  return (
    <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_1.15fr]">
      <div>
        <p className="eyebrow mb-3">For businesses</p>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight">Bulk orders &amp; corporate gifting</h1>
        <p className="mb-8 text-lg text-ink-soft">Original products at wholesale prices, straight from the authorised distributor.</p>
        <ul className="space-y-5">
          {[
            { icon: Gift, t: 'Corporate & festive gifts', d: 'Diwali hampers, employee welcome kits, client gifts and events.' },
            { icon: Store, t: 'Retailers & resellers', d: 'Stock original National Geographic and Shraddha products for your shop or online store.' },
            { icon: Receipt, t: 'GST invoice', d: `Proper tax invoice from ${SITE.name} (GSTIN ${SITE.gstin}).` },
            { icon: Truck, t: 'Pan-India delivery', d: 'Shipped from our Delhi warehouse to one or many addresses.' },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100"><Icon size={20} /></span>
              <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink-soft">{d}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-center gap-2 text-sm text-ink-soft"><Building2 size={16} /> Prefer to talk? Call <a className="font-semibold text-ink" href={SITE.phoneHref}>{SITE.phone}</a></p>
      </div>
      <LeadForm defaultType={sp.type === 'dealer' ? 'dealer' : 'bulk'} productSku={sp.product}
        products={list.map((p) => ({ sku: p.sku, label: `${displayName(p.name).slice(0, 55)} – ${inr(p.price)}` }))} />
    </div>
  );
}
