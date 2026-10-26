import { desc, inArray, ne } from 'drizzle-orm';
import { CheckCircle2, XCircle } from 'lucide-react';
import { db, socialComments, socialPosts } from '@/db';
import { requireStaff } from '@/lib/auth';
import { aiReady } from '@/lib/ai';
import { formatDateTime } from '@/lib/format';
import { getMarketingSettings } from '@/lib/marketing';
import { facebookReady, instagramReady } from '@/lib/meta';
import { saveMarketingSettings } from '../marketing-actions';
import { ActionForm, PageTitle } from '../ui';
import { CommentCard, PostCard, QuickActions } from './client';

export const metadata = { title: 'Social media' };

const Status = ({ ok, label, hint }: { ok: boolean; label: string; hint: string }) => (
  <li className="flex items-start gap-2 text-sm">
    {ok ? <CheckCircle2 size={18} className="shrink-0 text-green-600" /> : <XCircle size={18} className="shrink-0 text-red-600" />}
    <span><b>{label}</b> <span className="text-ink-muted">{ok ? 'connected' : hint}</span></span>
  </li>
);

export default async function MarketingPage() {
  const user = await requireStaff();
  const owner = user.role === 'owner';
  const [settings, upcoming, recent, needsHuman, replied] = await Promise.all([
    getMarketingSettings(),
    db.select().from(socialPosts).where(inArray(socialPosts.status, ['scheduled', 'draft', 'publishing', 'failed'])).orderBy(socialPosts.scheduledAt).limit(20),
    db.select().from(socialPosts).where(inArray(socialPosts.status, ['posted', 'partial'])).orderBy(desc(socialPosts.postedAt)).limit(10),
    db.select().from(socialComments).where(inArray(socialComments.status, ['needs_human', 'failed'])).orderBy(desc(socialComments.createdAt)).limit(30),
    db.select().from(socialComments).where(ne(socialComments.status, 'needs_human')).orderBy(desc(socialComments.updatedAt)).limit(15),
  ]);
  const webhookReady = !!(process.env.META_APP_SECRET && process.env.META_WEBHOOK_VERIFY_TOKEN);

  return (
    <>
      <PageTitle title="Social media" subtitle="Posts for offers and products are written and published automatically. Comments get friendly replies; tricky ones come to you.">
        <QuickActions owner={owner} />
      </PageTitle>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Connections</h2>
          <ul className="space-y-2">
            <Status ok={facebookReady()} label="Facebook Page" hint="– add META_PAGE_ID and META_PAGE_ACCESS_TOKEN" />
            <Status ok={instagramReady()} label="Instagram" hint="– add META_IG_USER_ID" />
            <Status ok={webhookReady} label="Comment alerts from Meta" hint="– add META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN" />
            <Status ok={aiReady()} label="AI writer" hint="– add ANTHROPIC_API_KEY (posts use simple templates until then)" />
            <Status ok={!!process.env.CRON_SECRET} label="Daily schedule" hint="– add CRON_SECRET" />
          </ul>
          <p className="mt-3 text-xs text-ink-muted">Setup steps are in the README under “Connect Facebook & Instagram”.</p>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Automation settings</h2>
          {owner ? (
            <ActionForm action={saveMarketingSettings} submit="Save settings" className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoPostEnabled" defaultChecked={settings.autoPostEnabled} className="h-4 w-4 accent-ink" /> Publish posts automatically</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoReplyEnabled" defaultChecked={settings.autoReplyEnabled} className="h-4 w-4 accent-ink" /> Reply to comments automatically</label>
              <label><span className="label">Product posts per week</span><input name="promoPostsPerWeek" type="number" min={0} max={14} defaultValue={settings.promoPostsPerWeek} className="input" /></label>
              <label><span className="label">Posting time (IST, 24h)</span><input name="postHourIst" type="number" min={6} max={22} defaultValue={settings.postHourIst} className="input" /></label>
              <label className="sm:col-span-2"><span className="label">Brand voice (how posts and replies should sound)</span><textarea name="brandVoice" rows={3} defaultValue={settings.brandVoice} className="input resize-none" /></label>
            </ActionForm>
          ) : (
            <p className="text-sm text-ink-soft">Auto-posting is {settings.autoPostEnabled ? 'on' : 'off'}; auto-replies are {settings.autoReplyEnabled ? 'on' : 'off'}. Only the owner can change these.</p>
          )}
        </section>
      </div>

      <section id="comments" className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Comments that need you ({needsHuman.length})</h2>
        {needsHuman.length === 0 ? <p className="card p-6 text-sm text-ink-muted">All caught up.</p> : (
          <div className="grid gap-3 lg:grid-cols-2">{needsHuman.map((c) => <CommentCard key={c.id} comment={c} />)}</div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Coming up</h2>
        {upcoming.length === 0 ? <p className="card p-6 text-sm text-ink-muted">Nothing scheduled. The daily run fills the week automatically, or use “Create product post”.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{upcoming.map((p) => <PostCard key={p.id} post={p} editable />)}</div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Recently posted</h2>
        {recent.length === 0 ? <p className="card p-6 text-sm text-ink-muted">Nothing posted yet.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recent.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent comment activity</h2>
        <div className="card divide-y divide-line">
          {replied.length === 0 && <p className="p-6 text-sm text-ink-muted">No comments yet.</p>}
          {replied.map((c) => (
            <div key={c.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_1fr]">
              <p><span className="text-xs text-ink-muted">{c.platform} · {c.authorName ?? 'someone'} · {formatDateTime(c.createdAt)}</span><br />“{c.text}”</p>
              <p className={c.status === 'replied' ? '' : 'text-ink-muted'}>{c.status === 'replied' ? <>↳ {c.reply}</> : c.status === 'ignored' ? 'No reply needed (spam or not a question)' : c.status}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
