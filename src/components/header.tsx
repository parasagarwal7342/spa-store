import Link from 'next/link';
import { Truck, Banknote, Phone } from 'lucide-react';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { FREE_SHIPPING_ABOVE } from '@/lib/shipping';
import { SITE } from '@/lib/site';
import { inr } from '@/lib/format';
import { HeaderClient } from './header-client';

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      <div className="bg-ink text-[12px] text-white/85">
        <div className="container-x flex h-9 items-center justify-center gap-6 sm:justify-between">
          <p className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Truck size={14} /> Free delivery in Delhi NCR &amp; above {inr(FREE_SHIPPING_ABOVE)}</span>
            <span className="hidden items-center gap-1.5 md:flex"><Banknote size={14} /> Cash on Delivery available</span>
          </p>
          <a href={SITE.phoneHref} className="hidden items-center gap-1.5 hover:text-white sm:flex"><Phone size={13} /> {SITE.phone}</a>
        </div>
      </div>
      <HeaderClient user={user ? { name: user.name, staff: isStaff(user) } : null} />
      <div className="border-b border-line" />
      <noscript><Link href="/shop">Shop</Link></noscript>
    </header>
  );
}
