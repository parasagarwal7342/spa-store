import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

export const onlinePaymentsEnabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const codEnabled = () => process.env.COD_ENABLED !== 'false';

export function razorpayClient() {
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
}

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqualHex(createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
}
