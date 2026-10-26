import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, orderItems, orders, type Order, type OrderItem } from '@/db';

export type OrderWithItems = Order & { items: OrderItem[] };

async function withItems(o: Order | undefined): Promise<OrderWithItems | null> {
  if (!o) return null;
  return { ...o, items: await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)) };
}

export async function orderByKey(number: string, key: string) {
  const [o] = await db.select().from(orders).where(and(eq(orders.number, number.toUpperCase()), eq(orders.accessKey, key)));
  return withItems(o);
}

/** Tracking lookup: order number plus the phone or email used at checkout. */
export async function orderByContact(number: string, contact: string) {
  const digits = contact.replace(/\D/g, '').slice(-10);
  const [o] = await db.select().from(orders).where(and(
    eq(orders.number, number.trim().toUpperCase()),
    digits.length === 10
      ? sql`right(regexp_replace(${orders.customerPhone}, '\\D', '', 'g'), 10) = ${digits}`
      : eq(orders.customerEmail, contact.trim().toLowerCase()),
  ));
  return withItems(o);
}

export async function ordersForUser(userId: number) {
  const list = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(50);
  return Promise.all(list.map((o) => withItems(o) as Promise<OrderWithItems>));
}
