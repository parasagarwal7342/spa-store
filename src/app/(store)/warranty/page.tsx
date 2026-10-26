import type { Metadata } from 'next';
import { LeadForm } from '@/components/lead-form';

export const metadata: Metadata = { title: 'Warranty, returns & support', description: '7-day returns on unused items and a 1-year coating warranty on Shraddha jewellery.' };

export default function WarrantyPage() {
  return (
    <div className="container-x grid gap-10 py-12 lg:grid-cols-2">
      <div>
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight">Warranty, returns &amp; support</h1>
        <div className="space-y-6 text-ink-soft">
          <section><h2 className="mb-1 font-bold text-ink">7-day returns</h2><p>Unused items in their original packaging can be returned within 7 days of delivery.</p></section>
          <section><h2 className="mb-1 font-bold text-ink">Shraddha 1-year coating warranty</h2><p>Covers natural oxidation or peeling of the coating within a year of purchase.</p></section>
          <section><h2 className="mb-1 font-bold text-ink">How to raise a claim</h2>
            <ol className="list-decimal space-y-1 pl-5"><li>Keep your invoice or order number handy.</li><li>Take clear photos of the issue.</li><li>Send the form here or WhatsApp us – we’ll guide you through pickup or exchange.</li></ol>
          </section>
        </div>
      </div>
      <LeadForm defaultType="warranty" fixedType />
    </div>
  );
}
