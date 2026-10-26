'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { put } from '@vercel/blob';
import { z } from 'zod';
import { coupons, db, leads, orders, products, users } from '@/db';
import { requireOwner, requireStaff } from '@/lib/auth';
import { releaseStock } from '@/lib/orders';
import { hashPassword } from '@/lib/password';
import { productSlug } from '@/lib/slug';
import { emailSchema, firstError } from '@/lib/validation';
import { publishDuePosts, queueOfferPost } from '@/lib/marketing';

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

// ---------- Orders ----------

const orderUpdate = z.object({
  id: z.coerce.number().int(),
  status: z.enum(['pending_payment', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  internalNote: z.string().trim().max(2000).optional(),
  codCollected: z.literal('on').optional(),
});

export async function updateOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const parsed = orderUpdate.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, d.id)).for('update');
    if (!o) return;
    // Cancelling puts stock back; re-opening a cancelled order takes it again.
    if (d.status === 'cancelled' && o.status !== 'cancelled') await releaseStock(tx, o.id);
    if (o.status === 'cancelled' && d.status !== 'cancelled') {
      await tx.execute(sql`UPDATE products p SET stock = GREATEST(p.stock - i.quantity, 0) FROM order_items i WHERE i.order_id = ${o.id} AND p.id = i.product_id AND p.stock IS NOT NULL`);
    }
    await tx.update(orders).set({
      status: d.status,
      courier: d.courier || null,
      trackingNumber: d.trackingNumber || null,
      internalNote: d.internalNote || null,
      paymentStatus: d.codCollected && o.paymentMethod === 'cod' ? 'paid' : o.paymentStatus,
      updatedAt: new Date(),
    }).where(eq(orders.id, o.id));
  });
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${d.id}`);
  return { ok: true, message: 'Order updated.' };
}

// ---------- Products ----------

const productForm = z.object({
  id: z.coerce.number().int().optional(),
  sku: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._-]+$/, 'SKU: letters, numbers, dot, dash or underscore only'),
  brand: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).default(''),
  highlights: z.string().default(''),
  images: z.string().default(''),
  price: z.coerce.number().int().positive('Enter the selling price'),
  mrp: z.union([z.literal(''), z.coerce.number().int().positive()]).optional(),
  stock: z.union([z.literal(''), z.coerce.number().int().min(0)]).optional(),
  wholesalePrice: z.union([z.literal(''), z.coerce.number().int().positive()]).optional(),
  wholesaleMinQty: z.coerce.number().int().min(1).default(10),
  featured: z.literal('on').optional(),
  active: z.literal('on').optional(),
});

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const optNum = (v: unknown) => (typeof v === 'number' ? v : null);

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  const parsed = productForm.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const images = lines(d.images);
  for (const file of form.getAll('upload')) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: 'Photo upload is not set up yet (add Vercel Blob storage). Paste image links instead.' };
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return { error: 'Photos must be images under 5 MB.' };
    const blob = await put(`products/${d.sku}-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`, file, { access: 'public' });
    images.push(blob.url);
  }
  if (!images.length) return { error: 'Add at least one photo.' };
  if (images.some((u) => !/^https:\/\//.test(u))) return { error: 'Image links must start with https://' };

  const values = {
    sku: d.sku, brand: d.brand, category: d.category, name: d.name, description: d.description,
    highlights: lines(d.highlights), images, price: d.price, mrp: optNum(d.mrp), stock: optNum(d.stock),
    wholesalePrice: optNum(d.wholesalePrice), wholesaleMinQty: d.wholesaleMinQty,
    featured: !!d.featured, active: !!d.active, slug: productSlug(d.name, d.sku), updatedAt: new Date(),
  };
  try {
    if (d.id) await db.update(products).set(values).where(eq(products.id, d.id));
    else await db.insert(products).values(values);
  } catch (e) {
    if (String(e).includes('unique')) return { error: `SKU ${d.sku} is already used by another product.` };
    throw e;
  }
  revalidatePath('/', 'layout');
  redirect('/admin/products?saved=1');
}

export async function setStock(productId: number, stock: number | null) {
  await requireStaff();
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return;
  await db.update(products).set({ stock, updatedAt: new Date() }).where(eq(products.id, productId));
  revalidatePath('/admin/products');
}

export async function deleteProduct(productId: number) {
  await requireStaff();
  await db.delete(products).where(eq(products.id, productId));
  revalidatePath('/', 'layout');
}

// ---------- Leads ----------

export async function updateLead(id: number, patch: { status?: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'; notes?: string }) {
  await requireStaff();
  await db.update(leads).set({ ...patch, updatedAt: new Date() }).where(eq(leads.id, id));
  revalidatePath('/admin/leads');
}

// ---------- Offers (coupons) ----------

const couponForm = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Code: 3–20 letters or numbers'),
  title: z.string().trim().max(80).optional(),
  percentOff: z.coerce.number().int().min(1).max(90),
  minOrder: z.coerce.number().int().min(0).default(0),
  maxUses: z.union([z.literal(''), z.coerce.number().int().min(1)]).optional(),
  expiresOn: z.string().optional(),
  promote: z.literal('on').optional(),
});

export async function saveCoupon(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner();
  const parsed = couponForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const expiresAt = d.expiresOn ? new Date(`${d.expiresOn}T23:59:59+05:30`) : null;
  const [saved] = await db.insert(coupons).values({
    code: d.code, title: d.title || null, percentOff: d.percentOff, minOrder: d.minOrder,
    maxUses: optNum(d.maxUses), expiresAt, promote: !!d.promote, active: true,
  }).onConflictDoUpdate({
    target: coupons.code,
    set: { title: d.title || null, percentOff: d.percentOff, minOrder: d.minOrder, maxUses: optNum(d.maxUses), expiresAt, promote: !!d.promote, active: true },
  }).returning();
  let message = `Offer ${saved.code} saved.`;
  if (saved.promote && !saved.announcedAt) {
    const queued = await queueOfferPost(saved.code);
    if (queued) {
      message += ' A social media post has been written and is being published now.';
      after(() => publishDuePosts(2));
    }
  }
  revalidatePath('/admin/offers');
  return { ok: true, message };
}

export async function toggleCoupon(code: string, active: boolean) {
  await requireOwner();
  await db.update(coupons).set({ active }).where(eq(coupons.code, code));
  revalidatePath('/admin/offers');
}

// ---------- Team ----------

export async function addStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner();
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: z.string().min(10, 'Temporary password: at least 10 characters').max(128),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const hash = await hashPassword(d.password);
  const [existing] = await db.select().from(users).where(eq(users.email, d.email));
  if (existing?.role === 'owner') return { error: 'That person is already the owner.' };
  if (existing) await db.update(users).set({ role: 'staff', name: d.name, passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, existing.id));
  else await db.insert(users).values({ name: d.name, email: d.email, passwordHash: hash, role: 'staff' });
  revalidatePath('/admin/team');
  return { ok: true, message: `${d.name} can now sign in with ${d.email}.` };
}

export async function removeStaff(userId: number) {
  await requireOwner();
  await db.update(users).set({ role: 'customer', updatedAt: new Date() }).where(and(eq(users.id, userId), eq(users.role, 'staff')));
  revalidatePath('/admin/team');
}
