'use client';

import { useActionState, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { login, register, type FormState } from '@/app/actions/auth';
import { SITE } from '@/lib/site';

export function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [inState, doLogin, loggingIn] = useActionState<FormState, FormData>(login, undefined);
  const [upState, doRegister, registering] = useActionState<FormState, FormData>(register, undefined);
  const error = mode === 'in' ? inState?.error : upState?.error;
  const busy = loggingIn || registering;

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-sand p-1" role="tablist">
        {(['in', 'up'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)}
            className={`rounded-lg py-2.5 text-sm font-semibold ${mode === m ? 'bg-white shadow-sm' : 'text-ink-muted'}`}>{m === 'in' ? 'Sign in' : 'Create account'}</button>
        ))}
      </div>
      <form action={mode === 'in' ? doLogin : doRegister} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === 'up' && (
          <>
            <label className="block"><span className="label">Full name</span><input name="name" required autoComplete="name" className="input" /></label>
            <label className="block"><span className="label">Mobile number (optional)</span><input name="phone" type="tel" autoComplete="tel" className="input" /></label>
          </>
        )}
        <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">Password</span>
          <input name="password" type="password" required minLength={mode === 'up' ? 8 : 1} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="input" />
          {mode === 'up' && <span className="mt-1 block text-xs text-ink-muted">At least 8 characters</span>}
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn-dark w-full py-3.5">{busy ? <Loader2 size={18} className="animate-spin" /> : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {mode === 'in' && <p className="text-center text-xs text-ink-muted">Forgot your password? WhatsApp {SITE.phone} and we’ll reset it.</p>}
      </form>
    </div>
  );
}
