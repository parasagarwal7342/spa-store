'use client';

import { useState, useTransition } from 'react';
import { Loader2, Megaphone, Play, Send, X } from 'lucide-react';
import type { SocialComment, SocialPost } from '@/db';
import { formatDateTime } from '@/lib/format';
import { cancelPost, createSpotlight, ignoreComment, publishNow, replyToCommentManually, runCycleNow, updatePostCaption } from '../marketing-actions';

const STATUS: Record<SocialPost['status'], string> = {
  draft: 'Draft', scheduled: 'Scheduled', publishing: 'Publishing…', posted: 'Posted', partial: 'Partly posted', failed: 'Failed', cancelled: 'Cancelled',
};

export function QuickActions({ owner }: { owner: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-2">
      {note && <span className="text-xs text-ink-muted">{note}</span>}
      <button disabled={pending} onClick={() => start(async () => { await createSpotlight(null); setNote('Product post created – publish it below or let it go out on schedule.'); })} className="btn-outline">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} Create product post
      </button>
      {owner && (
        <button disabled={pending} onClick={() => start(async () => { const r = await runCycleNow(); setNote(`Planned ${r.planned}, published ${r.published.length}, offers announced ${r.announced}.`); })} className="btn-dark">
          <Play size={16} /> Run automation now
        </button>
      )}
    </div>
  );
}

export function PostCard({ post, editable }: { post: SocialPost; editable?: boolean }) {
  const [caption, setCaption] = useState(post.caption);
  const [pending, start] = useTransition();
  const canEdit = editable && ['scheduled', 'draft', 'failed'].includes(post.status);
  return (
    <article className="card overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.imageUrl} alt="" className="aspect-square w-full bg-sand object-cover" loading="lazy" />
      <div className="space-y-2 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${post.status === 'failed' ? 'bg-red-50 text-red-700' : post.status === 'posted' ? 'bg-green-50 text-green-800' : 'bg-sand'}`}>{STATUS[post.status]}</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold capitalize text-brand-700">{post.kind === 'offer' ? `Offer ${post.couponCode ?? ''}` : post.kind === 'promo' ? 'Product' : 'Custom'}</span>
          <span className="text-ink-muted">{post.postedAt ? formatDateTime(post.postedAt) : formatDateTime(post.scheduledAt)}</span>
        </div>
        {canEdit ? (
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== post.caption && start(() => updatePostCaption(post.id, caption))} rows={7} className="input text-xs" aria-label="Caption" />
        ) : <p className="line-clamp-6 whitespace-pre-line text-xs text-ink-soft">{post.caption}</p>}
        {post.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{post.error}</p>}
        {canEdit && (
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => start(() => publishNow(post.id))} className="btn-dark flex-1 py-2">{pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish now</button>
            <button disabled={pending} onClick={() => start(() => cancelPost(post.id))} className="btn-outline py-2" aria-label="Cancel post"><X size={14} /></button>
          </div>
        )}
      </div>
    </article>
  );
}

export function CommentCard({ comment }: { comment: SocialComment }) {
  const [reply, setReply] = useState(comment.reply ?? '');
  const [pending, start] = useTransition();
  return (
    <article className="card space-y-2 p-4 text-sm">
      <p className="text-xs text-ink-muted">{comment.platform} · {comment.authorName ?? 'someone'} · {formatDateTime(comment.createdAt)}{comment.category ? ` · ${comment.category}` : ''}</p>
      <p className="font-medium">“{comment.text}”</p>
      {comment.error && <p className="text-xs text-red-700">{comment.error}</p>}
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write a reply…" className="input text-sm" aria-label="Reply" />
      <div className="flex gap-2">
        <button disabled={pending || reply.trim().length < 2} onClick={() => start(() => replyToCommentManually(comment.id, reply))} className="btn-dark flex-1 py-2">{pending ? <Loader2 size={14} className="animate-spin" /> : 'Post reply'}</button>
        <button disabled={pending} onClick={() => start(() => ignoreComment(comment.id))} className="btn-outline py-2">No reply</button>
      </div>
    </article>
  );
}
