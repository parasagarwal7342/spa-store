import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ChevronLeft, Phone } from 'lucide-react';
import { db, orderItems, orders } from '@/db';
import { STATUS_LABEL } from '@/components/order-summary';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { displayName, formatDateTime, inr, toWhatsAppNumber } from '@/lib/format';
import { SITE, whatsappLink } from '@/lib/site';
import { updateOrder } from '../../actions';
import { ActionForm } from '../../ui';

export const metadata = { title: 'Order' };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const trackLink = `${SITE.url}/track?order=${o.number}&contact=${o.customerPhone.slice(-10)}`;
  const msg = `Hi ${o.customerName.split(' ')[0]}, this is SPA Enterprise. Your order ${o.number} is ${STATUS_LABEL[o.status].toLowerCase()}.${o.trackingNumber ? ` ${o.courier ?? 'Courier'} tracking no.: ${o.trackingNumber}.` : ''} Track it here: ${trackLink}`;

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ChevronLeft size={16} /> Orders</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{o.number}</h1><p className="text-sm text-ink-soft">{formatDateTime(o.createdAt)} · {inr(o.total)} · {o.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'} ({o.paymentStatus})</p></div>
        <div className="flex gap-2">
          <a href={`tel:${o.customerPhone}`} className="btn-outline px-4"><Phone size={16} /> Call</a>
          <a href={whatsappLink(msg, toWhatsAppNumber(o.customerPhone))} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-4"><WhatsAppIcon size={16} /> Send update</a>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="divide-y divide-line text-sm">
              {items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2"><span>{displayName(i.name)} <span className="text-ink-muted">({i.sku}) × {i.quantity}</span></span><span className="font-semibold">{inr(i.unitPrice * i.quantity)}</span></li>)}
              {o.discount > 0 && <li className="flex justify-between py-2 text-green-700"><span>Coupon {o.couponCode}</span><span>−{inr(o.discount)}</span></li>}
              <li className="flex justify-between py-2 text-ink-soft"><span>Delivery</span><span>{o.shippingFee ? inr(o.shippingFee) : 'Free'}</span></li>
              <li className="flex justify-between py-2 font-bold"><span>Total</span><span>{inr(o.total)}</span></li>
            </ul>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-semibold">Ship to</h2>
            <p className="font-medium">{o.customerName}</p>
            <p>{o.addressLine}</p><p>{o.city}, {o.state} – {o.pincode}</p>
            <p className="mt-2 text-ink-soft">{o.customerPhone} · {o.customerEmail}</p>
            {o.customerNote && <p className="mt-3 rounded-lg bg-brand-50 p-3">Customer note: {o.customerNote}</p>}
          </section>
        </div>
        <section className="card h-fit p-5">
          <h2 className="mb-4 font-semibold">Update order</h2>
          <ActionForm action={updateOrder} submit="Save changes" className="grid gap-4">
            <input type="hidden" name="id" value={o.id} />
            <label><span className="label">Status</span>
              <select name="status" defaultValue={o.status} className="input">
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Courier</span><input name="courier" defaultValue={o.courier ?? ''} placeholder="Delhivery, DTDC…" className="input" /></label>
              <label><span className="label">Tracking number</span><input name="trackingNumber" defaultValue={o.trackingNumber ?? ''} className="input" /></label>
            </div>
            {o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="codCollected" className="h-4 w-4 accent-ink" /> Cash collected</label>
            )}
            <label><span className="label">Internal note (only the team sees this)</span><textarea name="internalNote" rows={3} defaultValue={o.internalNote ?? ''} className="input resize-none" /></label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
