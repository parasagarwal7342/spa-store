import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { AuthForms } from './auth-forms';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next?.startsWith('/') && !next.startsWith('//') ? next : isStaff(user) ? '/admin' : '/account');
  return (
    <div className="container-x grid max-w-5xl items-center gap-10 py-12 md:grid-cols-2">
      <div className="hidden md:block">
        <h1 className="mb-3 text-3xl font-extrabold">Welcome back</h1>
        <p className="text-ink-soft">Sign in to see your orders and check out faster. The SPA team uses the same page to reach the admin area.</p>
      </div>
      <AuthForms next={next ?? ''} />
    </div>
  );
}
