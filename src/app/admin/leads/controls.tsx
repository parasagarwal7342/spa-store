'use client';

import { useTransition } from 'react';
import { updateLead } from '../actions';

export function LeadControls({ id, status, notes }: { id: number; status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'; notes: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <select defaultValue={status} disabled={pending} aria-label="Lead status" className="input capitalize"
        onChange={(e) => start(() => updateLead(id, { status: e.target.value as typeof status }))}>
        {['new', 'contacted', 'quoted', 'won', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <textarea defaultValue={notes} rows={3} placeholder="Notes (saved when you click away)" aria-label="Notes" className="input resize-none text-xs"
        onBlur={(e) => e.target.value !== notes && start(() => updateLead(id, { notes: e.target.value }))} />
    </div>
  );
}
