'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from './cart-context';

const NAV = [
  { href: '/shop', label: 'Shop all' },
  { href: '/shop?brand=national-geographic', label: 'National Geographic' },
  { href: '/shop?brand=shraddha', label: 'Shraddha Jewellery' },
  { href: '/bulk-orders', label: 'Bulk & Corporate' },
  { href: '/track', label: 'Track order' },
];

export function HeaderClient({ user }: { user: { name: string; staff: boolean } | null }) {
  const { count, lastAddedAt } = useCart();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [pulse, setPulse] = useState(false);

  useEffect(() => setOpen(false), [pathname, params]);
  useEffect(() => {
    if (!lastAddedAt) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 700);
    return () => clearTimeout(t);
  }, [lastAddedAt]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  const SearchBox = (
    <form onSubmit={search} role="search" className="relative w-full">
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search backpacks, suitcases, bracelets…" aria-label="Search products" className="input bg-sand pl-10" />
    </form>
  );

  return (
    <>
      <div className="container-x flex h-16 items-center gap-4 lg:h-[72px] lg:gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SPA Enterprise home">
          <Image src="/logo.png" alt="" width={38} height={38} className="rounded-lg border border-line object-contain" priority />
          <span className="leading-none">
            <span className="block text-[17px] font-extrabold tracking-tight">SPA <span className="text-brand-600">ENTERPRISE</span></span>
            <span className="mt-0.5 hidden text-[10.5px] font-medium text-ink-muted sm:block">Authorised distributor · Delhi</span>
          </span>
        </Link>
        <div className="hidden max-w-xl flex-1 md:block">{SearchBox}</div>
        <nav className="ml-auto flex items-center gap-1" aria-label="Account and cart">
          {user?.staff && (
            <Link href="/admin" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-sand sm:flex"><LayoutDashboard size={18} /> Admin</Link>
          )}
          <Link href={user ? '/account' : '/login'} className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-sand sm:flex">
            <User size={18} /> {user ? user.name.split(' ')[0] : 'Sign in'}
          </Link>
          <Link href="/cart" aria-label={`Cart with ${count} items`} className={`relative rounded-xl p-2.5 transition hover:bg-sand ${pulse ? 'scale-110' : ''}`}>
            <ShoppingBag size={22} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand-500 px-1 text-[10px] font-bold text-ink">{count}</span>}
          </Link>
          <button onClick={() => setOpen(!open)} className="rounded-xl p-2.5 hover:bg-sand lg:hidden" aria-label="Menu" aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </nav>
      </div>
      <div className="container-x hidden h-11 items-center gap-7 text-sm font-medium text-ink-soft lg:flex">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}
        <Link href="/contact" className="ml-auto hover:text-ink">Contact</Link>
      </div>
      {open && (
        <div className="border-t border-line bg-white pb-5 pt-3 lg:hidden">
          <div className="container-x space-y-3">
            <div className="md:hidden">{SearchBox}</div>
            <div className="grid">
              {[...NAV, { href: '/contact', label: 'Contact' }].map((n) => <Link key={n.href} href={n.href} className="rounded-xl px-3 py-3 font-medium hover:bg-sand">{n.label}</Link>)}
              <Link href={user ? '/account' : '/login'} className="rounded-xl px-3 py-3 font-medium hover:bg-sand">{user ? 'My orders' : 'Sign in / Create account'}</Link>
              {user?.staff && <Link href="/admin" className="rounded-xl px-3 py-3 font-medium hover:bg-sand">Admin</Link>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
