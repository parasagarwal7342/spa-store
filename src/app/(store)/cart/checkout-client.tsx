'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Banknote, CreditCard, Loader2, Lock, Minus, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { useCart } from '@/components/cart-context';
import { abandonOnlinePayment, confirmOnlinePayment, placeOrder, quoteCart, type PricedCart } from '@/app/actions/checkout';
import { displayName, inr } from '@/lib/format';
import { INDIAN_STATES, isDelhiNcr } from '@/lib/shipping';

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } }
}

const loadRazorpay = () => new Promise<void>((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve();
  s.onerror = () => reject(new Error('Could not open the payment window. Check your connection and try again.'));
  document.body.appendChild(s);
});

const DETAILS_KEY = 'spa_checkout_details';
const EMPTY = { name: '', email: '', phone: '', addressLine: '', city: '', state: '', pincode: '', note: '' };

export function CheckoutClient({ online, cod, shipping, user }: {
  online: boolean; cod: boolean; shipping: { fee: number; freeAbove: number }; user: { name: string; email: string; phone: string } | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<PricedCart | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [payment, setPayment] = useState<'online' | 'cod'>(online ? 'online' : 'cod');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}'); } catch { /* ignore */ }
    setForm({ ...EMPTY, ...saved, ...(user ? { name: user.name, email: user.email, phone: user.phone || (saved as typeof EMPTY).phone || '' } : {}) });
  }, [user]);

  // Ask the server for authoritative prices whenever the cart, PIN or coupon changes.
  const linesKey = JSON.stringify(cart.items.map((i) => [i.productId, i.quantity]));
  useEffect(() => {
    if (!cart.ready || !cart.items.length) { setQuote(null); return; }
    const t = setTimeout(() => startTransition(async () => {
      const res = await quoteCart({ lines: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), pincode: form.pincode, couponCode: coupon });
      if (res.ok) {
        setQuote(res.data); setQuoteError(null);
        // Refresh cached names/prices/images in the browser cart.
        const fresh = new Map(res.data.items.map((i) => [i.productId, i]));
        if (cart.items.some((i) => fresh.get(i.productId)?.price !== i.price)) {
          cart.replace(cart.items.map((i) => { const f = fresh.get(i.productId); return f ? { ...i, price: f.price, name: f.name, image: f.image } : i; }));
        }
      } else {
        setQuoteError(res.error);
        if (coupon && /coupon/i.test(res.error)) setCoupon('');
      }
    }), 300);
    return () => clearTimeout(t);
  }, [linesKey, form.pincode, coupon, cart.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const freeGap = useMemo(() => (form.pincode && isDelhiNcr(form.pincode) ? 0 : Math.max(0, shipping.freeAbove - cart.subtotal)), [form.pincode, cart.subtotal, shipping.freeAbove]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...form, note: '' })); } catch { /* ignore */ }
    const res = await placeOrder({
      ...form, couponCode: coupon || undefined, paymentMethod: payment,
      lines: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    if (!res.ok) { setError(res.error); setBusy(false); return; }
    const { number, accessKey, razorpay } = res.data;
    const done = () => { cart.clear(); router.push(`/order/${number}?key=${accessKey}`); };
    if (!razorpay) { done(); return; }

    try {
      await loadRazorpay();
      new window.Razorpay!({
        key: razorpay.keyId, order_id: razorpay.orderId, amount: razorpay.amount, currency: 'INR',
        name: 'SPA Enterprise', description: `Order ${number}`, image: `${window.location.origin}/logo.png`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: '#14161b' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const ok = await confirmOnlinePayment({ number, ...r });
          if (ok.ok) done(); else { setError(ok.error); setBusy(false); }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError('Payment was not completed. You can try again or choose Cash on Delivery.');
            abandonOnlinePayment({ number, accessKey });
          },
        },
      }).open();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      abandonOnlinePayment({ number, accessKey });
    }
  };

  if (!cart.ready) return <div className="flex justify-center py-32"><Loader2 className="animate-spin" /></div>;

  if (!cart.items.length) {
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag size={48} className="mx-auto mb-4 text-ink-muted" />
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-8 text-ink-soft">Find original National Geographic bags and Shraddha jewellery.</p>
        <Link href="/shop" className="btn-dark">Start shopping</Link>
      </div>
    );
  }

  const noPayment = !online && !cod;

  return (
    <div className="container-x py-8 lg:py-12">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Checkout</h1>
      <form onSubmit={submit} className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card divide-y divide-line">
            {cart.items.map((i) => (
              <div key={i.productId} className="flex gap-4 p-4">
                <Link href={`/p/${i.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{i.brand}</p>
                  <Link href={`/p/${i.slug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{displayName(i.name)}</Link>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-lg border border-line">
                      <button type="button" onClick={() => cart.setQuantity(i.productId, i.quantity - 1)} className="p-1.5" aria-label={`Decrease ${i.name}`}><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button type="button" onClick={() => cart.setQuantity(i.productId, i.quantity + 1)} className="p-1.5" aria-label={`Increase ${i.name}`}><Plus size={14} /></button>
                    </div>
                    <span className="font-bold">{inr(i.price * i.quantity)}</span>
                    <button type="button" onClick={() => cart.remove(i.productId)} className="p-1.5 text-ink-muted hover:text-red-600" aria-label={`Remove ${i.name}`}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-1 text-lg font-bold">Delivery address</h2>
            {!user && <p className="mb-4 text-sm text-ink-soft">No account needed. <Link href="/login?next=/cart" className="font-semibold underline">Sign in</Link> to see your orders later.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="label">Full name</span><input required value={form.name} onChange={set('name')} autoComplete="name" className="input" /></label>
              <label><span className="label">Mobile number</span><input required type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="10-digit mobile" className="input" /></label>
              <label className="sm:col-span-2"><span className="label">Email (for order updates)</span><input required type="email" value={form.email} onChange={set('email')} autoComplete="email" className="input" /></label>
              <label className="sm:col-span-2"><span className="label">Address – house no., street, area, landmark</span><textarea required rows={2} value={form.addressLine} onChange={set('addressLine')} autoComplete="street-address" className="input resize-none" /></label>
              <label><span className="label">PIN code</span><input required inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" className="input" /></label>
              <label><span className="label">City</span><input required value={form.city} onChange={set('city')} autoComplete="address-level2" className="input" /></label>
              <label className="sm:col-span-2"><span className="label">State</span>
                <select required value={form.state} onChange={set('state')} autoComplete="address-level1" className="input">
                  <option value="">Choose state</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2"><span className="label">Note for us (optional)</span><input value={form.note} onChange={set('note')} placeholder="Gift message, delivery timing…" className="input" /></label>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">Payment</h2>
            {noPayment ? <p className="text-sm text-red-600">Ordering is paused right now. Please WhatsApp us to order.</p> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {online && (
                  <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${payment === 'online' ? 'border-ink bg-sand' : 'border-line'}`}>
                    <input type="radio" name="pay" checked={payment === 'online'} onChange={() => setPayment('online')} className="mt-1 accent-ink" />
                    <span><span className="flex items-center gap-2 text-sm font-semibold"><CreditCard size={16} /> Pay online</span><span className="text-xs text-ink-muted">UPI, cards, net banking, wallets</span></span>
                  </label>
                )}
                {cod && (
                  <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${payment === 'cod' ? 'border-ink bg-sand' : 'border-line'}`}>
                    <input type="radio" name="pay" checked={payment === 'cod'} onChange={() => setPayment('cod')} className="mt-1 accent-ink" />
                    <span><span className="flex items-center gap-2 text-sm font-semibold"><Banknote size={16} /> Cash on Delivery</span><span className="text-xs text-ink-muted">Pay when it arrives</span></span>
                  </label>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="card space-y-4 p-5 sm:p-6 lg:sticky lg:top-36">
          <h2 className="text-lg font-bold">Order summary</h2>
          {freeGap > 0 && <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">Add {inr(freeGap)} more for free delivery.</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{inr(quote?.subtotal ?? cart.subtotal)}</dd></div>
            {!!quote?.discount && <div className="flex justify-between text-green-700"><dt>Coupon {quote.couponCode}</dt><dd>−{inr(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{!form.pincode ? 'Enter PIN code' : quote ? (quote.shippingFee ? inr(quote.shippingFee) : 'Free') : '…'}</dd></div>
          </dl>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className="input pl-8" />
            </div>
            <button type="button" onClick={() => setCoupon(couponInput.trim())} className="btn-outline px-4">Apply</button>
          </div>
          {quoteError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{quoteError}</p>}
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-extrabold">{quote ? inr(quote.total) : inr(cart.subtotal)}</span>
          </div>
          <p className="-mt-2 text-xs text-ink-muted">Inclusive of GST</p>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || noPayment || !!quoteError} className="btn-primary w-full py-4 text-base">
            {busy ? <Loader2 size={18} className="animate-spin" /> : payment === 'cod' ? 'Place order' : `Pay ${quote ? inr(quote.total) : ''}`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted"><Lock size={12} /> Secure checkout{online ? ' · payments by Razorpay' : ''}</p>
        </aside>
      </form>
    </div>
  );
}
