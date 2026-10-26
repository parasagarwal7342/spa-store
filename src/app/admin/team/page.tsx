import { asc, inArray } from 'drizzle-orm';
import { db, users } from '@/db';
import { requireOwner } from '@/lib/auth';
import { addStaff } from '../actions';
import { ActionForm, PageTitle } from '../ui';
import { RemoveStaff } from './remove';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  await requireOwner();
  const team = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)
    .where(inArray(users.role, ['owner', 'staff'])).orderBy(asc(users.role), asc(users.name));
  return (
    <>
      <PageTitle title="Team" subtitle="Staff can manage orders, products, leads and social media. Only owners see sales figures, offers and the team." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card divide-y divide-line">
          {team.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span><b>{m.name}</b> <span className="text-ink-muted">· {m.email}</span></span>
              {m.role === 'owner' ? <span className="text-xs font-semibold">Owner</span> : <RemoveStaff id={m.id} name={m.name} />}
            </div>
          ))}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Add a staff member</h2>
          <ActionForm action={addStaff} submit="Give access" resetOnSuccess className="grid gap-3">
            <label><span className="label">Name</span><input name="name" required className="input" /></label>
            <label><span className="label">Email (they sign in with this)</span><input name="email" type="email" required className="input" /></label>
            <label><span className="label">Temporary password (share it privately)</span><input name="password" required minLength={10} className="input" /></label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
