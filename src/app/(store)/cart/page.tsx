import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { codEnabled, onlinePaymentsEnabled } from '@/lib/razorpay';
import { FREE_SHIPPING_ABOVE, SHIPPING_FEE } from '@/lib/shipping';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = { title: 'Cart & checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const user = await getCurrentUser();
  return (
    <CheckoutClient
      online={onlinePaymentsEnabled()}
      cod={codEnabled()}
      shipping={{ fee: SHIPPING_FEE, freeAbove: FREE_SHIPPING_ABOVE }}
      user={user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null}
    />
  );
}
