'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, users } from '@/db';
import { endSession, startSession } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { allow, clientIp } from '@/lib/rate-limit';
import { emailSchema, firstError, phoneSchema } from '@/lib/validation';

export type FormState = { error?: string } | undefined;

const safeNext = (next: unknown, fallback: string) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : fallback;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).safeParse({
    email: form.get('email'), password: form.get('password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password } = parsed.data;
  if (!(await allow(`login:${await clientIp()}:${email}`, 8, 900))) return { error: 'Too many attempts. Please wait 15 minutes.' };

  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u || !(await verifyPassword(password, u.passwordHash))) return { error: 'Incorrect email or password.' };
  await startSession(u);
  redirect(safeNext(form.get('next'), u.role === 'customer' ? '/account' : '/admin'));
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }).safeParse({ name: form.get('name'), email: form.get('email'), phone: form.get('phone') ?? '', password: form.get('password') });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await allow(`register:${await clientIp()}`, 10, 3600))) return { error: 'Too many sign-ups from this network. Try again later.' };

  const d = parsed.data;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  if (existing) return { error: 'An account with this email already exists. Please sign in.' };
  const [u] = await db.insert(users).values({ name: d.name, email: d.email, phone: d.phone || null, passwordHash: await hashPassword(d.password) }).returning();
  await startSession(u);
  redirect(safeNext(form.get('next'), '/account'));
}

export async function logout() {
  await endSession();
  redirect('/');
}
