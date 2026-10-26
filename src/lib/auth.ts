import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, users, type Role } from '@/db';
import { readSession, signSession, SESSION_COOKIE, SESSION_DAYS } from './session';

export type CurrentUser = { id: number; name: string; email: string; phone: string | null; role: Role };

/** The signed-in user, re-read from the database so role changes apply immediately. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [u] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role })
    .from(users).where(eq(users.id, session.uid));
  return u ?? null;
});

export async function startSession(u: { id: number; role: Role; name: string }) {
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: u.id, role: u.role, name: u.name }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const isStaff = (u: CurrentUser | null) => u?.role === 'staff' || u?.role === 'owner';

/** For admin pages and actions: redirects or throws unless the user has the role. */
export async function requireStaff() {
  const u = await getCurrentUser();
  if (!u) redirect('/login?next=/admin');
  if (!isStaff(u)) redirect('/');
  return u;
}

export async function requireOwner() {
  const u = await requireStaff();
  if (u.role !== 'owner') redirect('/admin');
  return u;
}
