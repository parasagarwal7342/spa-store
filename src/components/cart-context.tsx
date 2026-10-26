'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartItem {
  productId: number;
  quantity: number;
  // Display snapshot only; the server re-prices everything at checkout.
  name: string;
  slug: string;
  image: string;
  price: number;
  brand: string;
}

interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void;
  lastAddedAt: number;
}

const KEY = 'spa_cart';
const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) setItems(saved.filter((i) => Number.isInteger(i.productId) && i.quantity > 0));
    } catch { /* storage unavailable */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === item.productId);
      if (found) return prev.map((i) => (i.productId === item.productId ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, 500) } : i));
      return [...prev, { ...item, quantity }];
    });
    setLastAddedAt(Date.now());
  }, []);

  const value = useMemo<CartState>(() => ({
    items,
    ready,
    lastAddedAt,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.quantity * i.price, 0),
    add,
    setQuantity: (productId, quantity) =>
      setItems((prev) => (quantity <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, 500) } : i)))),
    remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
    clear: () => setItems([]),
    replace: setItems,
  }), [items, ready, lastAddedAt, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
