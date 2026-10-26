import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import { OrderSummary } from '@/components/order-summary';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { orderByKey } from '@/lib/order-view';
import { inr } from '@/lib/format';
import { whatsappLink } from '@/lib/site';

export const metadata: Metadata = { title: 'Your order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string }> }) {
  const [{ number }, { key }] = await Promise.all([params, searchParams]);
  const order = key ? await orderByKey(number, key) : null;
  if (!order) notFound();
  const waiting = order.status === 'pending_payment';

  return (
    <div className="container-x max-w-3xl py-12">
      <div className="mb-8 text-center">
        {waiting ? <Clock size={52} className="mx-auto mb-4 text-brand-600" /> : <CheckCircle2 size={52} className="mx-auto mb-4 text-green-600" />}
        <h1 className="mb-2 text-3xl font-extrabold">{waiting ? 'Waiting for payment confirmation' : `Thank you, ${order.customerName.split(' ')[0]}!`}</h1>
        <p className="text-ink-soft">
          {waiting ? 'If you completed the payment, this page will update shortly. Refresh in a minute.'
            : order.paymentMethod === 'cod' ? `Your order is confirmed. Please keep ${inr(order.total)} ready at delivery. We’ll call ${order.customerPhone} before dispatch.`
              : `Payment received and your order is confirmed. Updates will go to ${order.customerPhone}.`}
        </p>
        <p className="mt-2 text-sm text-ink-muted">Save this page’s link to check your order anytime.</p>
      </div>
      <OrderSummary order={order} />
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <a href={whatsappLink(`Hi SPA Enterprise, I placed order ${order.number} (${inr(order.total)}).`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><WhatsAppIcon size={18} /> Message us about this order</a>
        <Link href="/shop" className="btn-outline">Continue shopping</Link>
      </div>
    </div>
  );
}
