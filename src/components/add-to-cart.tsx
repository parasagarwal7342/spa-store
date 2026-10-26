'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, Zap } from 'lucide-react';
import { useCart, type CartItem } from './cart-context';

type Snapshot = Omit<CartItem, 'quantity'>;

export function AddToCartButton({ product, disabled, compact }: { product: Snapshot; disabled?: boolean; compact?: boolean }) {
  const { add, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = items.some((i) => i.productId === product.productId);

  const onClick = () => {
    add(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  if (compact) {
    return (
      <button onClick={onClick} disabled={disabled} aria-label={`Add ${product.name} to cart`}
        className={`rounded-xl border p-2.5 transition disabled:opacity-40 ${justAdded || inCart ? 'border-ink bg-ink text-brand-400' : 'border-line bg-sand hover:border-ink hover:bg-ink hover:text-white'}`}>
        {justAdded || inCart ? <Check size={18} /> : <ShoppingBag size={18} />}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className="btn-outline w-full border-ink py-3.5">
      {justAdded ? <><Check size={18} /> Added to cart</> : <><ShoppingBag size={18} /> Add to cart</>}
    </button>
  );
}

export function BuyBox({ product, maxQty, disabled }: { product: Snapshot; maxQty: number; disabled?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">Quantity</span>
          <div className="flex items-center rounded-xl border border-line">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 text-ink-muted hover:text-ink" aria-label="Decrease quantity"><Minus size={16} /></button>
            <span className="w-10 text-center font-semibold" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} className="p-2.5 text-ink-muted hover:text-ink" aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <button disabled={disabled} onClick={() => { add(product, qty); setAdded(true); setTimeout(() => setAdded(false), 1800); }} className="btn-outline border-ink py-3.5">
          {added ? <><Check size={18} /> Added</> : <><ShoppingBag size={18} /> Add to cart</>}
        </button>
        <button disabled={disabled} onClick={() => { add(product, qty); router.push('/cart'); }} className="btn-primary py-3.5">
          <Zap size={18} /> Buy now
        </button>
      </div>
    </div>
  );
}
