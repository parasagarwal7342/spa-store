import Link from 'next/link';
import { and, count, desc, eq, gte, inArray, lt, sql, sum } from 'drizzle-orm';
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { db, leads, orderItems, orders, products, socialComments } from '@/db';
import { requireStaff } from '@/lib/auth';
import { displayName, inr } from '@/lib/format';
import { releaseAbandonedOrders } from '@/lib/orders';
import { PageTitle } from './ui';

// Orders the business expects to fulfil: not cancelled, and paid online or COD.
const booked = and(sql`${orders.status} <> 'cancelled'`, sql`(${orders.paymentStatus} = 'paid' OR ${orders.paymentMethod} = 'cod')`);

async function periodTotals(fromDaysAgo: number, toDaysAgo: number) {
  const [r] = await db.select({ revenue: sum(orders.total).mapWith(Number), orders: count() }).from(orders)
    .where(and(booked, gte(orders.createdAt, sql`now() - make_interval(days => ${fromDaysAgo})`), lt(orders.createdAt, sql`now() - make_interval(days => ${toDaysAgo})`)));
  return { revenue: r.revenue ?? 0, orders: r.orders };
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-ink-muted">{now ? 'vs nothing last period' : '—'}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return <span className={`inline-flex items-center text-xs font-semibold ${up ? 'text-green-700' : 'text-red-700'}`}>{up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{up ? '+' : ''}{pct}% <span className="ml-1 font-normal text-ink-muted">vs previous 30 days</span></span>;
}

export default async function AdminHome() {
  const user = await requireStaff();
  await releaseAbandonedOrders();
  const [current, previous, toPack, newLeads, comments, lowStock] = await Promise.all([
    periodTotals(30, 0), periodTotals(60, 30),
    db.select({ n: count() }).from(orders).where(inArray(orders.status, ['confirmed', 'packed'])),
    db.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
    db.select({ n: count() }).from(socialComments).where(eq(socialComments.status, 'needs_human')),
    db.select({ id: products.id, name: products.name, stock: products.stock }).from(products)
      .where(and(eq(products.active, true), sql`${products.stock} IS NOT NULL AND ${products.stock} <= 5`)).orderBy(products.stock).limit(8),
  ]);
  const owner = user.role === 'owner';

  const [daily, top, codDue] = owner ? await Promise.all([
    db.select({ day: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`, revenue: sum(orders.total).mapWith(Number) })
      .from(orders).where(and(booked, gte(orders.createdAt, sql`now() - interval '30 days'`))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ name: orderItems.name, units: sum(orderItems.quantity).mapWith(Number), revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::int` })
      .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(booked, gte(orders.createdAt, sql`now() - interval '30 days'`)))
      .groupBy(orderItems.name).orderBy(desc(sql`3`)).limit(5),
    db.select({ v: sum(orders.total).mapWith(Number) }).from(orders).where(and(eq(orders.paymentMethod, 'cod'), eq(orders.paymentStatus, 'pending'), sql`${orders.status} <> 'cancelled'`)),
  ]) : [[], [], [{ v: 0 }]];

  // Continuous 30-day axis (IST dates), zero-filled.
  const byDay = new Map(daily.map((d) => [d.day, d.revenue ?? 0]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() + 5.5 * 3600000 - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { day: d, revenue: byDay.get(d) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.revenue));

  const work = [
    { label: 'Orders to pack & ship', value: toPack[0].n, href: '/admin/orders?status=open' },
    { label: 'New leads', value: newLeads[0].n, href: '/admin/leads' },
    { label: 'Comments needing a reply', value: comments[0].n, href: '/admin/marketing#comments' },
    { label: 'Low or out of stock', value: lowStock.length, href: '/admin/products?stock=low' },
  ];

  return (
    <>
      <PageTitle title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here’s what needs attention today." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {work.map((w) => (
          <Link key={w.label} href={w.href} className="card p-4 hover:border-ink">
            <p className="text-xs text-ink-muted">{w.label}</p>
            <p className={`text-2xl font-bold ${w.value ? 'text-ink' : 'text-ink-muted'}`}>{w.value}</p>
          </Link>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="mb-6 flex gap-2 rounded-xl border border-brand-400 bg-brand-50 px-4 py-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-brand-700" />
          <p>Running low: {lowStock.map((p) => `${displayName(p.name).slice(0, 38)} (${p.stock})`).join(' · ')}</p>
        </div>
      )}

      {owner && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card p-4"><p className="text-xs text-ink-muted">Revenue, last 30 days</p><p className="text-2xl font-bold">{inr(current.revenue)}</p><Delta now={current.revenue} before={previous.revenue} /></div>
            <div className="card p-4"><p className="text-xs text-ink-muted">Orders, last 30 days</p><p className="text-2xl font-bold">{current.orders}</p><Delta now={current.orders} before={previous.orders} /></div>
            <div className="card p-4"><p className="text-xs text-ink-muted">Average order value</p><p className="text-2xl font-bold">{inr(current.orders ? current.revenue / current.orders : 0)}</p></div>
            <div className="card p-4"><p className="text-xs text-ink-muted">COD cash still to collect</p><p className="text-2xl font-bold">{inr(codDue[0]?.v ?? 0)}</p></div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="card p-5">
              <h2 className="font-semibold">Daily revenue</h2>
              <p className="mb-4 text-xs text-ink-muted">Booked orders (paid online or COD), last 30 days · max {inr(max)}</p>
              <div className="flex h-48 items-end gap-[2px] border-b border-line" role="img" aria-label="Daily revenue for the last 30 days">
                {days.map((d) => (
                  <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center">
                    <div className="w-full max-w-[24px] rounded-t bg-ink transition group-hover:bg-brand-600" style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue ? 2 : 0 }} />
                    <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
                      {new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {inr(d.revenue)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-ink-muted"><span>30 days ago</span><span>Today</span></div>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Best sellers, last 30 days</h2>
              {top.length === 0 ? <p className="text-sm text-ink-muted">No sales yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-muted"><tr><th className="pb-2">Product</th><th className="pb-2 text-right">Units</th><th className="pb-2 text-right">Revenue</th></tr></thead>
                  <tbody className="divide-y divide-line">{top.map((t) => <tr key={t.name}><td className="py-2 pr-2">{displayName(t.name).slice(0, 44)}</td><td className="py-2 text-right">{t.units}</td><td className="py-2 text-right font-semibold">{inr(t.revenue)}</td></tr>)}</tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
