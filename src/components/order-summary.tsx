import Image from 'next/image';
import type { OrderWithItems } from '@/lib/order-view';
import { displayName, formatDateTime, inr } from '@/lib/format';
import type { OrderStatus } from '@/db';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STEPS: OrderStatus[] = ['confirmed', 'packed', 'shipped', 'delivered'];

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled' || status === 'pending_payment') {
    return <p className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status === 'cancelled' ? 'bg-line text-ink-soft' : 'bg-brand-100 text-brand-700'}`}>{STATUS_LABEL[status]}</p>;
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2 text-[11px] font-semibold sm:text-xs" aria-label={`Order status: ${STATUS_LABEL[status]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className="space-y-1.5">
          <span className={`block h-1.5 rounded-full ${i <= current ? 'bg-green-600' : 'bg-line'}`} />
          <span className={i <= current ? 'text-green-700' : 'text-ink-muted'}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderSummary({ order }: { order: OrderWithItems }) {
  return (
    <article className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{order.number}</p>
          <p className="text-xs text-ink-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold">{inr(order.total)}</p>
          <p className="text-xs text-ink-muted">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'} · {order.paymentStatus === 'paid' ? 'paid' : 'payment pending'}</p>
        </div>
      </div>
      <div className="mb-5"><OrderProgress status={order.status} /></div>
      {(order.courier || order.trackingNumber) && (
        <p className="mb-5 rounded-xl bg-sand px-4 py-3 text-sm">Shipped via <b>{order.courier ?? 'courier'}</b>{order.trackingNumber && <> · tracking no. <b>{order.trackingNumber}</b></>}</p>
      )}
      <ul className="divide-y divide-line">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />}</span>
            <span className="flex-1">{displayName(i.name)} <span className="text-ink-muted">× {i.quantity}</span></span>
            <span className="font-semibold">{inr(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        {order.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount {order.couponCode}</dt><dd>−{inr(order.discount)}</dd></div>}
        <div className="flex justify-between text-ink-soft"><dt>Delivery</dt><dd>{order.shippingFee ? inr(order.shippingFee) : 'Free'}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-ink-muted">Delivering to {order.customerName}, {order.addressLine}, {order.city}, {order.state} – {order.pincode}</p>
    </article>
  );
}
