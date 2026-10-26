'use client';

import { useTransition } from 'react';
import { toggleCoupon } from '../actions';

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => toggleCoupon(code, !active))}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-green-100 text-green-800' : 'bg-line text-ink-soft'}`}>
      {active ? 'Active' : 'Paused'}
    </button>
  );
}
