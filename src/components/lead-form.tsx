'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitLead, type LeadState } from '@/app/actions/leads';
import { whatsappLink } from '@/lib/site';
import { WhatsAppIcon } from './whatsapp-icon';

type LeadType = 'bulk' | 'dealer' | 'contact' | 'warranty';

export function LeadForm({ defaultType = 'contact', fixedType, products = [], productSku = '' }: {
  defaultType?: LeadType; fixedType?: boolean; products?: { sku: string; label: string }[]; productSku?: string;
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, undefined);
  const [type, setType] = useState<LeadType>(defaultType);
  const trade = type === 'bulk' || type === 'dealer';

  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-green-600" />
        <h3 className="mb-1 text-lg font-bold">Thank you{state.name ? `, ${state.name.split(' ')[0]}` : ''}! We’ve got your request.</h3>
        <p className="mb-5 text-sm text-ink-soft">Our team usually calls back within one working day.</p>
        <a href={whatsappLink('Hi SPA Enterprise, I just sent a request on your website.')} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><WhatsAppIcon size={18} /> Need it faster? WhatsApp us</a>
      </div>
    );
  }

  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {fixedType ? <input type="hidden" name="type" value={type} /> : (
        <label className="sm:col-span-2"><span className="label">I’d like to</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as LeadType)} className="input">
            <option value="bulk">Get a bulk / corporate gifting quote</option>
            <option value="dealer">Become a dealer or reseller</option>
            <option value="contact">Ask a question</option>
            <option value="warranty">Warranty, return or exchange</option>
          </select>
        </label>
      )}
      <label><span className="label">Your name</span><input name="name" required autoComplete="name" className="input" /></label>
      <label><span className="label">Mobile number</span><input name="phone" type="tel" required autoComplete="tel" className="input" /></label>
      <label><span className="label">Email (optional)</span><input name="email" type="email" autoComplete="email" className="input" /></label>
      {trade ? <label><span className="label">Company / shop name</span><input name="company" autoComplete="organization" className="input" /></label>
        : type === 'warranty' ? <label><span className="label">Order number (if you have it)</span><input name="orderNumber" placeholder="SPA-…" className="input" /></label>
          : <label><span className="label">City</span><input name="city" className="input" /></label>}
      {trade && (
        <>
          <label><span className="label">Product (optional)</span>
            <select name="productSku" defaultValue={productSku} className="input">
              <option value="">Mixed / not sure yet</option>
              {products.map((p) => <option key={p.sku} value={p.sku}>{p.label}</option>)}
            </select>
          </label>
          <label><span className="label">Approx. quantity</span><input name="quantity" type="number" min={1} placeholder="e.g. 50" className="input" /></label>
          <label className="sm:col-span-2"><span className="label">City</span><input name="city" className="input" /></label>
        </>
      )}
      <label className="sm:col-span-2"><span className="label">Message</span>
        <textarea name="message" rows={3} className="input resize-none" placeholder={trade ? 'Occasion, delivery date, logo/branding needs, budget…' : 'How can we help?'} />
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <button disabled={pending} className="btn-dark py-3.5 sm:col-span-2">{pending ? <Loader2 size={18} className="animate-spin" /> : trade ? 'Get my quote' : 'Send'}</button>
    </form>
  );
}
