import { z } from 'zod';

export const phoneSchema = z.string().trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit mobile number');

export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);

export const cartLinesSchema = z.array(z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(500),
})).min(1, 'Your cart is empty.').max(50);

/** First readable message from a Zod error. */
export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? 'Please check the form.';
