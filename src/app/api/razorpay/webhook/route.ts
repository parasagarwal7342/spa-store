import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders } from '@/db';
import { markOrderPaid } from '@/lib/orders';
import { notifyTeam } from '@/lib/notify';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { inr } from '@/lib/format';

// Confirms payments even if the customer closed the browser before returning to the site.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, signature)) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });

  const event = JSON.parse(raw);
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id) {
      const [before] = await db.select({ status: orders.paymentStatus }).from(orders).where(eq(orders.razorpayOrderId, payment.order_id));
      const o = await markOrderPaid(payment.order_id, payment.id);
      if (o && before?.status !== 'paid') await notifyTeam(`💳 Payment received for ${o.number}: ${inr(o.total)} (${o.customerName})`);
    }
  }
  return NextResponse.json({ ok: true });
}
