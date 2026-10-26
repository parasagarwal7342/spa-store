import { desc } from 'drizzle-orm';
import { coupons, db } from '@/db';
import { requireOwner } from '@/lib/auth';
import { formatDate, inr } from '@/lib/format';
import { saveCoupon } from '../actions';
import { ActionForm, PageTitle } from '../ui';
import { CouponToggle } from './toggle';

export const metadata = { title: 'Offers' };

export default async function OffersPage() {
  await requireOwner();
  const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return (
    <>
      <PageTitle title="Offers & coupons" subtitle="Customers enter the code at checkout. Ticked offers are announced on Facebook & Instagram automatically." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto">
          {list.length === 0 ? <p className="p-10 text-center text-ink-muted">No offers yet. Create your first one →</p> : (
            <table className="w-full text-sm">
              <thead className="bg-sand text-left text-xs text-ink-muted"><tr><th className="p-3">Code</th><th className="p-3">Offer</th><th className="p-3">Used</th><th className="p-3">Social</th><th className="p-3">Active</th></tr></thead>
              <tbody className="divide-y divide-line">
                {list.map((c) => (
                  <tr key={c.code}>
                    <td className="p-3 font-mono font-bold">{c.code}</td>
                    <td className="p-3">{c.title && <b className="block">{c.title}</b>}{c.percentOff}% off{c.minOrder ? ` above ${inr(c.minOrder)}` : ''}{c.expiresAt ? ` · till ${formatDate(c.expiresAt)}` : ''}</td>
                    <td className="p-3">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className="p-3 text-xs">{c.announcedAt ? `Posted ${formatDate(c.announcedAt)}` : c.promote ? 'Queued' : 'Off'}</td>
                    <td className="p-3"><CouponToggle code={c.code} active={c.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <section className="card h-fit p-5">
          <h2 className="mb-4 font-semibold">Create or update an offer</h2>
          <ActionForm action={saveCoupon} submit="Save offer" resetOnSuccess className="grid gap-3">
            <label><span className="label">Code customers type</span><input name="code" required placeholder="DIWALI15" className="input uppercase" /></label>
            <label><span className="label">Offer name (for posts)</span><input name="title" placeholder="Diwali Sale" className="input" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">% off</span><input name="percentOff" type="number" min={1} max={90} required defaultValue={10} className="input" /></label>
              <label><span className="label">Min. order ₹</span><input name="minOrder" type="number" min={0} defaultValue={0} className="input" /></label>
              <label><span className="label">Max uses (optional)</span><input name="maxUses" type="number" min={1} className="input" /></label>
              <label><span className="label">Last day (optional)</span><input name="expiresOn" type="date" className="input" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="promote" defaultChecked className="h-4 w-4 accent-ink" /> Announce on Facebook &amp; Instagram</label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
