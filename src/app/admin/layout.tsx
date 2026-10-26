import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { requireStaff } from '@/lib/auth';
import { AdminNav } from './nav';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-screen bg-sand lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg border border-line" />
          <div className="leading-tight"><p className="text-sm font-extrabold">SPA Admin</p><p className="text-[11px] text-ink-muted">{user.name} · {user.role === 'owner' ? 'Owner' : 'Staff'}</p></div>
        </div>
        <AdminNav owner={user.role === 'owner'} />
        <div className="hidden space-y-1 px-3 pb-4 pt-6 lg:block">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-sand"><ExternalLink size={16} /> View website</Link>
          <form action={logout}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-red-50 hover:text-red-700"><LogOut size={16} /> Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
