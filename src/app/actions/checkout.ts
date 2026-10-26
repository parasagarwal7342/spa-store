'use server';

import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { coupons, db, orderItems, orders } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { CheckoutError, markOrderPaid, newAccessKey, newOrderNumber, priceCart, releaseAbandonedOrders, releaseStock, reserveStock } from '@/lib/orders';
import { codEnabled, onlinePaymentsEnabled, razorpayClient, verifyCheckoutSignature } from '@/lib/razorpay';
import { notifyTeam } from '@/lib/notify';
import { allow, clientIp } from '@/lib/rate-limit';
import { INDIAN_STATES } from '@/lib/shipping';
import { cartLinesSchema, emailSchema, firstError, phoneSchema, pincodeSchema } from '@/lib/validation';
import { inr } from '@/lib/format';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PricedCart {
  items: { productId: number; name: string; slug: string; image: string; brand: string; price: number; quantity: number; stock: number | null }[];
  subtotal: number; discount: number; couponCode: string | null; shippingFee: number; total: number;
}

/** Live cart pricing for the cart page. Also refreshes names/prices the browser has cached. */
export async function quoteCart(input: { lines: { productId: number; quantity: number }[]; pincode?: string; couponCode?: string }): Promise<Result<PricedCart>> {
  const lines = cartLinesSchema.safeParse(input.lines);
  if (!lines.success) return { ok: false, error: firstError(lines.error) };
  try {
    const pin = input.pincode && /^[1-9]\d{5}$/.test(input.pincode) ? input.pincode : null;
    const p = await priceCart(lines.data, pin, input.couponCode || null);
    return {
      ok: true,
      data: {
        items: p.items.map(({ product, quantity }) => ({
          productId: product.id, name: product.name, slug: product.slug, image: product.images[0] ?? '', brand: product.brand,
          price: product.price, quantity, stock: product.stock,
        })),
        subtotal: p.subtotal, discount: p.discount, couponCode: p.couponCode, shippingFee: p.shippingFee, total: p.total,
      },
    };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }
}

const checkoutSchema = z.object({
  lines: cartLinesSchema,
  couponCode: z.string().trim().max(24).optional(),
  paymentMethod: z.enum(['online', 'cod']),
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: emailSchema,
  phone: phoneSchema,
  addressLine: z.string().trim().min(8, 'Enter your full address').max(300),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  state: z.enum(INDIAN_STATES, { errorMap: () => ({ message: 'Choose your state' }) }),
  pincode: pincodeSchema,
  note: z.string().trim().max(500).optional(),
});

export type PlaceOrderResult = Result<{
  number: string; accessKey: string;
  razorpay?: { keyId: string; orderId: string; amount: number };
}>;

// The state arrives as a plain string from the form; the schema checks it against the list.
export async function placeOrder(input: Omit<z.input<typeof checkoutSchema>, 'state'> & { state: string }): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  if (!(await allow(`order:${await clientIp()}`, 20, 3600))) return { ok: false, error: 'Too many orders from this network. Please call us to complete your order.' };
  if (d.paymentMethod === 'online' && !onlinePaymentsEnabled()) return { ok: false, error: 'Online payment is not available right now. Please choose Cash on Delivery.' };
  if (d.paymentMethod === 'cod' && !codEnabled()) return { ok: false, error: 'Cash on Delivery is not available right now.' };

  await releaseAbandonedOrders();
  const user = await getCurrentUser();
  const number = newOrderNumber();
  const accessKey = newAccessKey();

  let created: { id: number; total: number };
  try {
    created = await db.transaction(async (tx) => {
      const priced = await priceCart(d.lines, d.pincode, d.couponCode || null, tx);
      await reserveStock(tx, priced.items.map((i) => ({ productId: i.product.id, quantity: i.quantity, name: i.product.name })));
      if (priced.couponCode) await tx.update(coupons).set({ uses: sql`${coupons.uses} + 1` }).where(eq(coupons.code, priced.couponCode));
      const [o] = await tx.insert(orders).values({
        number, accessKey, userId: user?.id ?? null,
        customerName: d.name, customerEmail: d.email, customerPhone: d.phone,
        addressLine: d.addressLine, city: d.city, state: d.state, pincode: d.pincode,
        subtotal: priced.subtotal, discount: priced.discount, couponCode: priced.couponCode, shippingFee: priced.shippingFee, total: priced.total,
        paymentMethod: d.paymentMethod, status: d.paymentMethod === 'cod' ? 'confirmed' : 'pending_payment', customerNote: d.note || null,
      }).returning({ id: orders.id, total: orders.total });
      await tx.insert(orderItems).values(priced.items.map((i) => ({
        orderId: o.id, productId: i.product.id, sku: i.product.sku, name: i.product.name, brand: i.product.brand,
        image: i.product.images[0] ?? null, unitPrice: i.product.price, quantity: i.quantity,
      })));
      return o;
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }

  if (d.paymentMethod === 'cod') {
    await notifyTeam(`🛒 New COD order ${number}: ${inr(created.total)} from ${d.name} (${d.phone}), ${d.city}`);
    return { ok: true, data: { number, accessKey } };
  }

  try {
    const rzp = await razorpayClient().orders.create({ amount: created.total * 100, currency: 'INR', receipt: number, notes: { order_number: number } });
    await db.update(orders).set({ razorpayOrderId: rzp.id }).where(eq(orders.id, created.id));
    return { ok: true, data: { number, accessKey, razorpay: { keyId: process.env.RAZORPAY_KEY_ID!, orderId: rzp.id, amount: Number(rzp.amount) } } };
  } catch (e) {
    console.error('Razorpay order failed', e);
    await cancelUnpaid(created.id);
    return { ok: false, error: 'Could not start the online payment. Please try again or choose Cash on Delivery.' };
  }
}

async function cancelUnpaid(orderId: number) {
  await db.transaction(async (tx) => {
    const [o] = await tx.update(orders).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'pending_payment'))).returning();
    if (!o) return;
    await releaseStock(tx, orderId);
    if (o.couponCode) await tx.update(coupons).set({ uses: sql`GREATEST(${coupons.uses} - 1, 0)` }).where(eq(coupons.code, o.couponCode));
  });
}

export async function confirmOnlinePayment(input: { number: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<Result<{ number: string }>> {
  const [o] = await db.select().from(orders).where(eq(orders.number, input.number));
  if (!o || o.razorpayOrderId !== input.razorpay_order_id) return { ok: false, error: 'Order not found.' };
  if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    return { ok: false, error: `We could not verify this payment. If money was deducted, contact us with order ${o.number}.` };
  }
  const paid = await markOrderPaid(input.razorpay_order_id, input.razorpay_payment_id);
  if (paid && o.paymentStatus !== 'paid') await notifyTeam(`💳 Paid order ${o.number}: ${inr(o.total)} from ${o.customerName} (${o.customerPhone}), ${o.city}`);
  return { ok: true, data: { number: o.number } };
}

/** Customer closed the payment window: free the reserved stock straight away. */
export async function abandonOnlinePayment(input: { number: string; accessKey: string }) {
  const [o] = await db.select({ id: orders.id, accessKey: orders.accessKey, status: orders.status }).from(orders).where(eq(orders.number, input.number));
  if (o && o.accessKey === input.accessKey && o.status === 'pending_payment') await cancelUnpaid(o.id);
}

