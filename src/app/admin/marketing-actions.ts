'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db, marketingSettings, socialComments, socialPosts } from '@/db';
import { requireOwner, requireStaff } from '@/lib/auth';
import { createPromoPost, getMarketingSettings, publishPost, runMarketingCycle, sendCommentReply } from '@/lib/marketing';
import { firstError } from '@/lib/validation';
import type { ActionState } from './actions';

const done = () => revalidatePath('/admin/marketing');

export async function saveMarketingSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireOwner();
  const parsed = z.object({
    autoPostEnabled: z.literal('on').optional(),
    autoReplyEnabled: z.literal('on').optional(),
    promoPostsPerWeek: z.coerce.number().int().min(0).max(14),
    postHourIst: z.coerce.number().int().min(6).max(22),
    brandVoice: z.string().trim().min(10, 'Describe the brand voice in a sentence or two').max(600),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  await getMarketingSettings();
  await db.update(marketingSettings).set({
    autoPostEnabled: !!d.autoPostEnabled, autoReplyEnabled: !!d.autoReplyEnabled, promoPostsPerWeek: d.promoPostsPerWeek,
    postHourIst: d.postHourIst, brandVoice: d.brandVoice, updatedAt: new Date(),
  }).where(eq(marketingSettings.id, 1));
  done();
  return { ok: true, message: 'Automation settings saved.' };
}

export async function publishNow(id: number) {
  await requireStaff();
  await publishPost(id);
  done();
}

export async function cancelPost(id: number) {
  await requireStaff();
  await db.update(socialPosts).set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(socialPosts.id, id), inArray(socialPosts.status, ['scheduled', 'draft', 'failed'])));
  done();
}

export async function updatePostCaption(id: number, caption: string) {
  await requireStaff();
  const text = caption.trim().slice(0, 2100);
  if (text.length < 10) return;
  await db.update(socialPosts).set({ caption: text, updatedAt: new Date() })
    .where(and(eq(socialPosts.id, id), inArray(socialPosts.status, ['scheduled', 'draft', 'failed'])));
  done();
}

export async function createSpotlight(productId: number | null) {
  await requireStaff();
  await createPromoPost(new Date(), productId ?? undefined);
  done();
}

export async function runCycleNow() {
  await requireOwner();
  const r = await runMarketingCycle();
  done();
  return r;
}

export async function replyToCommentManually(id: number, reply: string) {
  await requireStaff();
  if (reply.trim().length < 2) return;
  await sendCommentReply(id, reply.trim().slice(0, 1000));
  done();
}

export async function ignoreComment(id: number) {
  await requireStaff();
  await db.update(socialComments).set({ status: 'ignored', updatedAt: new Date() }).where(eq(socialComments.id, id));
  done();
}
