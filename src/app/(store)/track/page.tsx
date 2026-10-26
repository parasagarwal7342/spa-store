import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { OrderSummary } from '@/components/order-summary';
import { orderByContact } from '@/lib/order-view';
import { allow, clientIp } from '@/lib/rate-limit';

export const metadata: Metadata = { title: 'Track your order', description: 'Check the status of your SPA Enterprise order with your order number and mobile number.' };
export const dynamic = 'force-dynamic';

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; contact?: string }> }) {
  const sp = await searchParams;
  let result: Awaited<ReturnType<typeof orderByContact>> = null;
  let error: string | null = null;
  if (sp.order && sp.contact) {
    if (!(await allow(`track:${await clientIp()}`, 30, 3600))) error = 'Too many lookups. Please try again later.';
    else {
      result = await orderByContact(sp.order, sp.contact);
      if (!result) error = 'No order matches those details. Check the order number (it starts with SPA-) and the mobile number used at checkout.';
    }
  }
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="mb-2 text-3xl font-extrabold">Track your order</h1>
      <p className="mb-6 text-ink-soft">Enter the order number from your confirmation and the mobile number or email you ordered with.</p>
      <form className="card mb-6 grid items-end gap-3 p-5 sm:grid-cols-[1fr_1fr_auto]">
        <label><span className="label">Order number</span><input name="order" required defaultValue={sp.order} placeholder="SPA-…" className="input uppercase" /></label>
        <label><span className="label">Mobile or email</span><input name="contact" required defaultValue={sp.contact} className="input" /></label>
        <button className="btn-dark"><Search size={16} /> Track</button>
      </form>
      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {result && <OrderSummary order={result} />}
    </div>
  );
}
