import Link from 'next/link';
import { and, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { db, orders, type OrderStatus } from '@/db';
import { STATUS_LABEL } from '@/components/order-summary';
import { formatDateTime, inr } from '@/lib/format';
import { PageTitle } from '../ui';

const FILTERS: [string, string][] = [['open', 'To pack & ship'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['pending_payment', 'Awaiting payment'], ['cancelled', 'Cancelled'], ['all', 'All']];

export const metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? 'open';
  const where: SQL[] = [];
  if (status === 'open') where.push(inArray(orders.status, ['confirmed', 'packed']));
  else if (status !== 'all') where.push(eq(orders.status, status as OrderStatus));
  if (sp.q?.trim()) {
    const t = `%${sp.q.trim()}%`;
    where.push(or(ilike(orders.number, t), ilike(orders.customerName, t), ilike(orders.customerPhone, t), ilike(orders.customerEmail, t), ilike(orders.city, t))!);
  }
  const list = await db.select().from(orders).where(and(...where)).orderBy(desc(orders.createdAt)).limit(200);

  return (
    <>
      <PageTitle title="Orders" subtitle={`${list.length} shown`}>
        <form className="relative w-full sm:w-72">
          <input type="hidden" name="status" value={status} />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Order no., name, phone, city" className="input bg-white pl-9" />
        </form>
      </PageTitle>
      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {FILTERS.map(([v, l]) => <Link key={v} href={`/admin/orders?status=${v}`} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${status === v ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</Link>)}
      </div>
      {list.length === 0 ? <p className="card p-10 text-center text-ink-muted">No orders here.</p> : (
        <div className="card divide-y divide-line">
          {list.map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="grid grid-cols-2 items-center gap-x-4 gap-y-1 p-4 hover:bg-sand sm:grid-cols-[1.2fr_1.4fr_1fr_auto]">
              <div><p className="font-semibold">{o.number}</p><p className="text-xs text-ink-muted">{formatDateTime(o.createdAt)}</p></div>
              <div className="text-right sm:text-left"><p className="text-sm font-medium">{o.customerName}</p><p className="text-xs text-ink-muted">{o.city} · {o.customerPhone}</p></div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-sand px-2 py-0.5">{STATUS_LABEL[o.status]}</span>
                <span className={`rounded-full px-2 py-0.5 ${o.paymentStatus === 'paid' ? 'bg-green-50 text-green-800' : 'bg-brand-50 text-brand-700'}`}>{o.paymentMethod === 'cod' ? 'COD' : 'Online'} · {o.paymentStatus}</span>
              </div>
              <p className="text-right font-bold">{inr(o.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
