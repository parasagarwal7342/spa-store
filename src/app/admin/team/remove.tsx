'use client';

import { useTransition } from 'react';
import { removeStaff } from '../actions';

export function RemoveStaff({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => confirm(`Remove admin access for ${name}?`) && start(() => removeStaff(id))} className="text-xs font-semibold text-red-700 hover:underline">
      Remove access
    </button>
  );
}
