import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, isNull, lt, or, sql, gte } from 'drizzle-orm';
import { coupons, db, orderItems, orders, products } from '@/db';
import { shippingFor } from './shipping';

export class CheckoutError extends Error {}

export interface CartLine { productId: number; quantity: number }

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Prices a cart from the database. Never trusts prices from the browser. */
export async function priceCart(lines: CartLine[], pincode: string | null, couponCode: string | null, tx: Tx | typeof db = db) {
  const merged = new Map<number, number>();
  for (const l of lines) merged.set(l.productId, Math.min((merged.get(l.productId) ?? 0) + l.quantity, 500));
  if (!merged.size) throw new CheckoutError('Your cart is empty.');

  const rows = await tx.select().from(products).where(and(inArray(products.id, [...merged.keys()]), eq(products.active, true)));
  const items = [...merged.entries()].map(([productId, quantity]) => {
    const p = rows.find((r) => r.id === productId);
    if (!p) throw new CheckoutError('An item in your cart is no longer available. Please review your cart.');
    if (p.stock !== null && p.stock < quantity) {
      throw new CheckoutError(p.stock === 0 ? `${p.name} has just sold out.` : `Only ${p.stock} left of ${p.name}.`);
    }
    return { product: p, quantity, lineTotal: p.price * quantity };
  });

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode?.trim()) {
    const code = couponCode.trim().toUpperCase();
    const [c] = await tx.select().from(coupons).where(eq(coupons.code, code));
    if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date()) || (c.maxUses !== null && c.uses >= c.maxUses)) {
      throw new CheckoutError('That coupon code is not valid.');
    }
    if (subtotal < c.minOrder) throw new CheckoutError(`Coupon ${c.code} needs a minimum order of ₹${c.minOrder.toLocaleString('en-IN')}.`);
    discount = Math.floor((subtotal * c.percentOff) / 100);
    appliedCoupon = c.code;
  }
  const shippingFee = shippingFor(subtotal - discount, pincode);
  return { items, subtotal, discount, couponCode: appliedCoupon, shippingFee, total: subtotal - discount + shippingFee };
}

export function newOrderNumber() {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000); // IST date in the number
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `SPA-${ymd}-${rand}`;
}

export const newAccessKey = () => randomBytes(16).toString('hex');

/** Atomically takes stock for every line; throws if any item ran out in the meantime. */
export async function reserveStock(tx: Tx, lines: { productId: number; quantity: number; name: string }[]) {
  for (const l of lines) {
    const updated = await tx.update(products)
      .set({ stock: sql`${products.stock} - ${l.quantity}` })
      .where(and(eq(products.id, l.productId), or(isNull(products.stock), gte(products.stock, l.quantity))))
      .returning({ id: products.id });
    if (!updated.length) throw new CheckoutError(`${l.name} has just sold out.`);
  }
}

export async function releaseStock(tx: Tx, orderId: number) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const i of items) {
    if (i.productId === null) continue;
    await tx.update(products).set({ stock: sql`${products.stock} + ${i.quantity}` })
      .where(and(eq(products.id, i.productId), sql`${products.stock} IS NOT NULL`));
  }
}

/** Cancels online orders left unpaid for 30+ minutes and puts their stock back. */
export async function releaseAbandonedOrders() {
  const stale = await db.select({ id: orders.id, coupon: orders.couponCode }).from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.createdAt, sql`now() - interval '30 minutes'`)));
  for (const o of stale) {
    await db.transaction(async (tx) => {
      const res = await tx.update(orders).set({ status: 'cancelled', updatedAt: new Date(), internalNote: 'Auto-cancelled: online payment not completed.' })
        .where(and(eq(orders.id, o.id), eq(orders.status, 'pending_payment'))).returning({ id: orders.id });
      if (!res.length) return;
      await releaseStock(tx, o.id);
      if (o.coupon) await tx.update(coupons).set({ uses: sql`GREATEST(${coupons.uses} - 1, 0)` }).where(eq(coupons.code, o.coupon));
    });
  }
}

/** Marks an online order paid (idempotent). Re-reserves stock if it had been auto-cancelled. */
export async function markOrderPaid(razorpayOrderId: string, paymentId: string) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId)).for('update');
    if (!o) return null;
    if (o.paymentStatus === 'paid') return o;
    let note = o.internalNote;
    if (o.status === 'cancelled') {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      for (const i of items) {
        if (i.productId !== null) {
          await tx.update(products).set({ stock: sql`GREATEST(${products.stock} - ${i.quantity}, 0)` })
            .where(and(eq(products.id, i.productId), sql`${products.stock} IS NOT NULL`));
        }
      }
      note = 'Payment arrived after auto-cancel; order re-opened. Check stock before packing.';
    }
    const [updated] = await tx.update(orders).set({
      paymentStatus: 'paid', razorpayPaymentId: paymentId, status: 'confirmed', internalNote: note, updatedAt: new Date(),
    }).where(eq(orders.id, o.id)).returning();
    return updated;
  });
}
