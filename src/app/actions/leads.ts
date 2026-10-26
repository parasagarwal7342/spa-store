'use server';

import { z } from 'zod';
import { db, leads } from '@/db';
import { notifyTeam } from '@/lib/notify';
import { allow, clientIp } from '@/lib/rate-limit';
import { emailSchema, firstError, phoneSchema } from '@/lib/validation';

export type LeadState = { ok?: boolean; error?: string; name?: string } | undefined;

const LABEL = { bulk: 'Bulk quote', dealer: 'Dealer enquiry', contact: 'Message', warranty: 'Warranty/return' } as const;

export async function submitLead(_prev: LeadState, form: FormData): Promise<LeadState> {
  if (form.get('website')) return { ok: true, name: '' }; // honeypot: bots fill hidden fields
  const parsed = z.object({
    type: z.enum(['bulk', 'dealer', 'contact', 'warranty']),
    name: z.string().trim().min(2, 'Enter your name').max(80),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal('')),
    company: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional(),
    productSku: z.string().trim().max(40).optional(),
    quantity: z.coerce.number().int().min(1).max(100000).optional().or(z.literal('')),
    orderNumber: z.string().trim().max(24).optional(),
    message: z.string().trim().max(2000).default(''),
  }).safeParse(Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : undefined])));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await allow(`lead:${await clientIp()}`, 10, 3600))) return { error: 'Too many requests. Please call or WhatsApp us instead.' };

  const d = parsed.data;
  await db.insert(leads).values({
    type: d.type, name: d.name, phone: d.phone, email: d.email || null, company: d.company || null, city: d.city || null,
    productSku: d.productSku || null, quantity: typeof d.quantity === 'number' ? d.quantity : null, orderNumber: d.orderNumber || null, message: d.message,
  });
  await notifyTeam(`📩 ${LABEL[d.type]} from ${d.name}${d.company ? ` (${d.company})` : ''}, ${d.phone}${typeof d.quantity === 'number' ? `, qty ${d.quantity}` : ''}`);
  return { ok: true, name: d.name };
}
