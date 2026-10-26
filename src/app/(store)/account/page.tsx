import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { OrderSummary } from '@/components/order-summary';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { ordersForUser } from '@/lib/order-view';

export const metadata: Metadata = { title: 'My orders', robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');
  const list = await ordersForUser(user.id);
  return (
    <div className="container-x max-w-3xl py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold">My orders</h1><p className="text-ink-soft">{user.name} · {user.email}</p></div>
        <div className="flex gap-2">
          {isStaff(user) && <Link href="/admin" className="btn-dark">Admin</Link>}
          <form action={logout}><button className="btn-outline">Sign out</button></form>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={40} className="mx-auto mb-3 text-ink-muted" />
          <p className="mb-1 font-semibold">No orders yet</p>
          <p className="mb-6 text-sm text-ink-soft">Orders placed without signing in can be found on the <Link href="/track" className="underline">tracking page</Link>.</p>
          <Link href="/shop" className="btn-primary">Start shopping</Link>
        </div>
      ) : <div className="space-y-4">{list.map((o) => <OrderSummary key={o.id} order={o} />)}</div>}
    </div>
  );
}
