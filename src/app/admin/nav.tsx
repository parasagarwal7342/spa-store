'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Megaphone, Package, ShoppingCart, Tag, Users, UserCog } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: BarChart3 },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'Products & stock', icon: Package },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/marketing', label: 'Social media', icon: Megaphone },
  { href: '/admin/offers', label: 'Offers & coupons', icon: Tag, owner: true },
  { href: '/admin/team', label: 'Team', icon: UserCog, owner: true },
];

export function AdminNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {ITEMS.filter((i) => owner || !i.owner).map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-sand'}`}>
            <Icon size={17} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
