'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ActionState } from './actions';

/** A form bound to a server action that shows its success or error message. */
export function ActionForm({ action, children, className, submit, resetOnSuccess }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode; className?: string; submit: string; resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className} key={resetOnSuccess && state?.ok ? state.message : undefined}>
      {children}
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-full">{state.error}</p>}
      {state?.ok && state.message && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-full">{state.message}</p>}
      <button disabled={pending} className="btn-dark sm:col-span-full">{pending ? <Loader2 size={16} className="animate-spin" /> : submit}</button>
    </form>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}</div>
      {children}
    </div>
  );
}
