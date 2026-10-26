import type { Metadata } from 'next';
import Link from 'next/link';
import { inr } from '@/lib/format';
import { FREE_SHIPPING_ABOVE, SHIPPING_FEE } from '@/lib/shipping';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Shipping, returns, privacy & terms' };

const S = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="card scroll-mt-40 space-y-3 p-6 text-sm leading-relaxed text-ink-soft"><h2 className="text-xl font-bold text-ink">{title}</h2>{children}</section>
);

export default function PoliciesPage() {
  return (
    <div className="container-x max-w-3xl space-y-6 py-12">
      <div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight">Store policies</h1>
        <nav className="flex flex-wrap gap-4 text-sm font-semibold">{[['shipping', 'Shipping'], ['returns', 'Returns & refunds'], ['cancellation', 'Cancellation'], ['privacy', 'Privacy'], ['terms', 'Terms']].map(([id, l]) => <a key={id} href={`#${id}`} className="underline">{l}</a>)}</nav>
      </div>
      <S id="shipping" title="Shipping">
        <p>All orders ship from our Delhi warehouse.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Delhi NCR (PIN codes starting 110, 121, 122, 201): free delivery.</li>
          <li>Rest of India: {inr(SHIPPING_FEE)} per order, free on orders of {inr(FREE_SHIPPING_ABOVE)} or more.</li>
          <li>For deliveries outside India, contact us for a quote.</li>
        </ul>
        <p>When your order ships, the courier and tracking number appear on the <Link href="/track" className="underline">tracking page</Link>.</p>
      </S>
      <S id="returns" title="Returns & refunds">
        <p>Unused items in original packaging can be returned within 7 days of delivery. Shraddha jewellery carries a 1-year coating warranty – see <Link href="/warranty" className="underline">Warranty &amp; support</Link>.</p>
        <p>Approved refunds go back to the original payment method; Cash on Delivery orders are refunded by UPI or bank transfer. Banks usually take 5–7 working days to show the credit.</p>
      </S>
      <S id="cancellation" title="Cancellation">
        <p>You can cancel free of charge until your order is shipped – call or WhatsApp {SITE.phone} with your order number. Prepaid orders are refunded in full.</p>
      </S>
      <S id="privacy" title="Privacy">
        <p>We collect only what we need to deliver your order and reply to you: name, phone, email and address. Card and UPI details are handled by Razorpay and never reach our servers. Passwords are stored in hashed form.</p>
        <p>We don’t sell your data. It is shared only with courier partners and our payment provider to complete your order. Email {SITE.email} to see or delete your data.</p>
      </S>
      <S id="terms" title="Terms of sale">
        <p>Products are sold by M/S {SITE.name} (GSTIN {SITE.gstin}, {SITE.udyam}). Prices are in Indian Rupees and include GST. Images are for illustration; slight colour differences may occur.</p>
        <p>If a price is listed in error, we’ll contact you before dispatch and you may cancel for a full refund. Disputes are subject to the courts of Delhi.</p>
      </S>
    </div>
  );
}
