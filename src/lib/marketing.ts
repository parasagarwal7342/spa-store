import 'server-only';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  coupons, db, marketingSettings, products, socialComments, socialPosts, type Product, type SocialPost,
} from '@/db';
import { askClaude, z } from './ai';
import { displayName, inr, percentOff } from './format';
import { facebookReady, instagramReady, postToFacebook, postToInstagram, replyToComment } from './meta';
import { notifyTeam } from './notify';
import { FREE_SHIPPING_ABOVE } from './shipping';
import { SITE } from './site';

// ---------- Settings ----------

export async function getMarketingSettings() {
  const [row] = await db.select().from(marketingSettings).where(eq(marketingSettings.id, 1));
  if (row) return row;
  const [created] = await db.insert(marketingSettings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(marketingSettings).where(eq(marketingSettings.id, 1)))[0];
}

/** Next posting slot at the configured hour (IST), at least `minMinutes` from now. */
function nextSlot(hourIst: number, after = new Date(), minMinutes = 30) {
  const istOffset = 5.5 * 3600 * 1000;
  const ist = new Date(after.getTime() + istOffset);
  const slot = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), hourIst, 0, 0) - istOffset);
  while (slot.getTime() < after.getTime() + minMinutes * 60000) slot.setUTCDate(slot.getUTCDate() + 1);
  return slot;
}

// ---------- Writing posts ----------

const postSchema = z.object({
  caption: z.string().describe('The post text, 2-5 short lines, ending with a clear call to action and the link.'),
  hashtags: z.array(z.string()).describe('6-10 relevant hashtags without spaces, each starting with #'),
  headline: z.string().describe('3-6 word headline for the image, no emoji'),
});

const productLine = (p: Product) =>
  `- ${displayName(p.name)} | ${p.brand} | ${p.category} | ${inr(p.price)}${p.mrp && p.mrp > p.price ? ` (MRP ${inr(p.mrp)}, ${percentOff(p.price, p.mrp)}% off)` : ''} | ${SITE.url}/p/${p.slug}`;

async function writePost(brief: string, items: Product[], link: string, fallback: { caption: string; headline: string }) {
  const settings = await getMarketingSettings();
  const system = `You write social media posts for ${SITE.name}, Delhi – authorised distributor of National Geographic bags/luggage and Shraddha brass jewellery. Website: ${SITE.url}.
Voice: ${settings.brandVoice}
Rules: write like a real person on the shop's team, not like an advert generator. Use only the facts given – never invent prices, discounts, stock levels, deadlines or product features. Mention that products are 100% original. At most 2 emoji. Put the link on its own line. Shipping facts you may use: free delivery in Delhi NCR and on orders above ${inr(FREE_SHIPPING_ABOVE)}; Cash on Delivery available.`;
  const prompt = `${brief}\n\nProducts:\n${items.map(productLine).join('\n')}\n\nLink to use: ${link}`;
  const ai = await askClaude(system, prompt, postSchema);
  if (!ai) return { caption: `${fallback.caption}\n\n${link}\n\n#NationalGeographic #Shraddha #SPAEnterprise #Delhi #OriginalProducts`, headline: fallback.headline };
  const tags = ai.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`).replace(/\s+/g, '')).slice(0, 10).join(' ');
  const caption = ai.caption.includes(link) ? ai.caption : `${ai.caption}\n\n${link}`;
  return { caption: `${caption}\n\n${tags}`.slice(0, 2100), headline: ai.headline.slice(0, 60) };
}

const imageUrl = (params: Record<string, string>) => `${SITE.url}/api/social-image?${new URLSearchParams(params)}`;

async function pickProducts(limit: number, excludeRecentDays = 21) {
  const recent = await db.select({ ids: socialPosts.productIds }).from(socialPosts)
    .where(gte(socialPosts.createdAt, sql`now() - make_interval(days => ${excludeRecentDays})`));
  const used = new Set(recent.flatMap((r) => r.ids));
  const pool = await db.select().from(products)
    .where(and(eq(products.active, true), sql`(${products.stock} IS NULL OR ${products.stock} > 0)`))
    .orderBy(desc(products.featured), desc(sql`COALESCE(${products.mrp} - ${products.price}, 0)`), asc(products.id));
  const fresh = pool.filter((p) => !used.has(p.id));
  return (fresh.length >= limit ? fresh : pool).slice(0, limit);
}

/** Creates the announcement post for an offer/coupon. Returns false if there is nothing to post about. */
export async function queueOfferPost(code: string) {
  const [c] = await db.select().from(coupons).where(eq(coupons.code, code));
  if (!c || !c.active) return false;
  const items = await pickProducts(3, 0);
  if (!items.length) return false;
  const name = c.title || `${c.percentOff}% off`;
  const terms = [
    c.minOrder ? `on orders above ${inr(c.minOrder)}` : 'on everything in the store',
    c.expiresAt ? `valid till ${c.expiresAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' })}` : null,
    c.maxUses ? `limited to the first ${c.maxUses} orders` : null,
  ].filter(Boolean).join(', ');
  const link = `${SITE.url}/shop?utm_source=social&utm_medium=post&utm_campaign=${encodeURIComponent(c.code.toLowerCase())}`;
  const { caption, headline } = await writePost(
    `Announce a new offer: "${name}" – ${c.percentOff}% off with coupon code ${c.code} ${terms}. Customers enter the code at checkout. Feature the products below as examples.`,
    items, link,
    { caption: `${name}! Get ${c.percentOff}% off ${terms} with code ${c.code} at checkout.\nOriginal National Geographic & Shraddha products, delivered from Delhi.`, headline: `${c.percentOff}% OFF – code ${c.code}` },
  );
  await db.insert(socialPosts).values({
    kind: 'offer', caption, couponCode: c.code, productIds: items.map((p) => p.id), link, scheduledAt: new Date(),
    imageUrl: imageUrl({ type: 'offer', code: c.code, headline, product: String(items[0].id) }),
  });
  await db.update(coupons).set({ announcedAt: new Date() }).where(eq(coupons.code, c.code));
  return true;
}

/** Product spotlight post for the regular schedule. */
export async function createPromoPost(scheduledAt: Date, productId?: number): Promise<SocialPost | null> {
  const items = productId ? await db.select().from(products).where(eq(products.id, productId)) : await pickProducts(1);
  const p = items[0];
  if (!p) return null;
  const link = `${SITE.url}/p/${p.slug}?utm_source=social&utm_medium=post&utm_campaign=spotlight`;
  const off = percentOff(p.price, p.mrp);
  const { caption, headline } = await writePost(
    `Write a product spotlight post for the product below. Pick one practical angle (travel, daily commute, gifting, festive occasions, durability or sustainability) that genuinely fits it.`,
    [p], link,
    { caption: `${displayName(p.name)} – now ${inr(p.price)}${off ? ` (${off}% off MRP)` : ''}.\n100% original from the authorised distributor. Free delivery in Delhi NCR.`, headline: displayName(p.name).split(' ').slice(0, 5).join(' ') },
  );
  const [post] = await db.insert(socialPosts).values({
    kind: 'promo', caption, link, productIds: [p.id], scheduledAt,
    imageUrl: imageUrl({ type: 'product', product: String(p.id), headline }),
  }).returning();
  return post;
}

/** Keeps the next 7 days filled with the configured number of promo posts. */
export async function planUpcomingPosts() {
  const s = await getMarketingSettings();
  if (!s.autoPostEnabled || s.promoPostsPerWeek <= 0) return 0;
  const weekAhead = new Date(Date.now() + 7 * 86400000);
  const upcoming = await db.select({ at: socialPosts.scheduledAt }).from(socialPosts)
    .where(and(eq(socialPosts.kind, 'promo'), inArray(socialPosts.status, ['scheduled', 'draft']), lte(socialPosts.scheduledAt, weekAhead)));
  const missing = s.promoPostsPerWeek - upcoming.length;
  if (missing <= 0) return 0;
  // Spread posts evenly: each new one goes `gapDays` after the last scheduled one, never in the past.
  const gapMs = Math.max(1, Math.floor(7 / s.promoPostsPerWeek)) * 86400000;
  let last = upcoming.length ? Math.max(...upcoming.map((u) => u.at.getTime())) : Date.now() - gapMs;
  let created = 0;
  for (let i = 0; i < missing; i++) {
    const slot = nextSlot(s.postHourIst, new Date(Math.max(last + gapMs - 3600000, Date.now())));
    if (await createPromoPost(slot)) created++;
    last = slot.getTime();
  }
  return created;
}

// ---------- Publishing ----------

export async function publishPost(id: number) {
  // Claim the post so two runs never publish it twice.
  const [post] = await db.update(socialPosts).set({ status: 'publishing', updatedAt: new Date() })
    .where(and(eq(socialPosts.id, id), inArray(socialPosts.status, ['scheduled', 'failed', 'draft']))).returning();
  if (!post) return null;

  const errors: string[] = [];
  let fbId = post.facebookPostId;
  let igId = post.instagramMediaId;
  if (post.toFacebook && !fbId) {
    if (!facebookReady()) errors.push('Facebook not connected');
    else try { fbId = await postToFacebook(post.caption, post.imageUrl); } catch (e) { errors.push(`Facebook: ${(e as Error).message}`); }
  }
  if (post.toInstagram && !igId) {
    if (!instagramReady()) errors.push('Instagram not connected');
    else try { igId = await postToInstagram(post.caption, post.imageUrl); } catch (e) { errors.push(`Instagram: ${(e as Error).message}`); }
  }
  const anyPosted = !!(fbId || igId);
  const status = errors.length ? (anyPosted ? 'partial' : 'failed') : 'posted';
  await db.update(socialPosts).set({
    status, facebookPostId: fbId, instagramMediaId: igId, error: errors.join(' · ') || null,
    postedAt: anyPosted ? (post.postedAt ?? new Date()) : null, updatedAt: new Date(),
  }).where(eq(socialPosts.id, id));
  if (errors.length && !anyPosted) await notifyTeam(`⚠️ Social post #${id} failed: ${errors.join(' · ')}`);
  return status;
}

/** `earlyMinutes` lets a once-a-day cron (which fires somewhere within its hour) still catch that hour's posts. */
export async function publishDuePosts(limit = 5, earlyMinutes = 0) {
  const s = await getMarketingSettings();
  if (!s.autoPostEnabled) return [];
  const due = await db.select({ id: socialPosts.id }).from(socialPosts)
    .where(and(eq(socialPosts.status, 'scheduled'), lte(socialPosts.scheduledAt, new Date(Date.now() + earlyMinutes * 60000))))
    .orderBy(asc(socialPosts.scheduledAt)).limit(limit);
  const results = [];
  for (const p of due) results.push({ id: p.id, status: await publishPost(p.id) });
  return results;
}

/** Offers that were saved with "promote" but not yet announced (e.g. created before automation was on). */
export async function announcePendingOffers() {
  const pending = await db.select({ code: coupons.code }).from(coupons)
    .where(and(eq(coupons.active, true), eq(coupons.promote, true), sql`${coupons.announcedAt} IS NULL`,
      sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} > now())`));
  for (const c of pending) await queueOfferPost(c.code);
  return pending.length;
}

// ---------- Comment replies ----------

const replySchema = z.object({
  category: z.enum(['question', 'praise', 'purchase_intent', 'complaint', 'spam', 'other']),
  needs_human: z.boolean().describe('true for complaints, order/delivery/refund problems, angry or sensitive comments, anything you are unsure about, or if the person asks whether they are talking to a bot'),
  reply: z.string().describe('The reply to post publicly. Empty string if no reply should be posted.'),
});

async function catalogBrief() {
  const rows = await db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.brand), asc(products.category));
  return rows.map((p) => `- ${displayName(p.name)} | ${p.category} | ${inr(p.price)}${p.stock === 0 ? ' | SOLD OUT' : ''} | ${SITE.url}/p/${p.slug}`).join('\n');
}

/** Stores a new comment and, when it's safe, replies like a person from the shop would. */
export async function handleIncomingComment(c: { platform: 'facebook' | 'instagram'; externalId: string; postExternalId?: string; authorName?: string; text: string }) {
  const [saved] = await db.insert(socialComments).values({
    platform: c.platform, externalId: c.externalId, postExternalId: c.postExternalId ?? null, authorName: c.authorName ?? null, text: c.text.slice(0, 4000),
  }).onConflictDoNothing().returning();
  if (!saved) return; // already handled (Meta retries deliveries)

  const settings = await getMarketingSettings();
  const [post] = c.postExternalId
    ? await db.select({ caption: socialPosts.caption }).from(socialPosts)
      .where(sql`${socialPosts.facebookPostId} = ${c.postExternalId} OR ${socialPosts.instagramMediaId} = ${c.postExternalId}`)
    : [];

  const system = `You reply to comments on the Facebook and Instagram posts of ${SITE.name}, Delhi (authorised distributor of National Geographic bags/luggage and Shraddha brass jewellery). Website ${SITE.url}. Phone/WhatsApp ${SITE.phone}.
Voice: ${settings.brandVoice}
How to reply:
- Sound like a friendly person from the shop's team: short (1-3 sentences), natural, warm. Match the commenter's language (English, Hindi or Hinglish). Use their first name if it is shown. At most one emoji. No hashtags. Never use phrases like "As an AI" or "I hope this helps".
- Answer only from the facts below. Give exact prices and product links from the catalogue when relevant. If you don't know something, invite them to WhatsApp ${SITE.phone} instead of guessing.
- Never promise discounts, delivery dates or stock that isn't listed. Never ask for payment or personal details in public.
- For order, delivery, refund or quality problems, complaints, rude or sensitive comments: set needs_human = true (the team will handle it).
- For spam or unrelated promotions: category spam, empty reply.
Store facts: free delivery in Delhi NCR and on orders above ${inr(FREE_SHIPPING_ABOVE)}; Cash on Delivery available; 7-day returns on unused items; Shraddha jewellery has a 1-year coating warranty; bulk/corporate quotes at ${SITE.url}/bulk-orders.
Catalogue:
${await catalogBrief()}`;
  const prompt = `${post ? `Post the comment is on:\n"""${post.caption.slice(0, 800)}"""\n\n` : ''}Comment by ${c.authorName || 'a customer'} on ${c.platform}:\n"""${c.text.slice(0, 1500)}"""`;

  const ai = await askClaude(system, prompt, replySchema);
  if (!ai) {
    await db.update(socialComments).set({ status: 'needs_human', error: 'AI not available', updatedAt: new Date() }).where(eq(socialComments.id, saved.id));
    return;
  }
  const reply = ai.reply.trim();
  if (ai.category === 'spam' || (!reply && !ai.needs_human)) {
    await db.update(socialComments).set({ category: ai.category, status: 'ignored', updatedAt: new Date() }).where(eq(socialComments.id, saved.id));
    return;
  }
  if (ai.needs_human || !settings.autoReplyEnabled) {
    await db.update(socialComments).set({ category: ai.category, reply: reply || null, status: 'needs_human', updatedAt: new Date() }).where(eq(socialComments.id, saved.id));
    if (ai.needs_human) await notifyTeam(`💬 ${c.platform} comment needs a reply from the team (${ai.category}): "${c.text.slice(0, 140)}" – ${SITE.url}/admin/marketing`);
    return;
  }
  await sendCommentReply(saved.id, reply, ai.category);
}

export async function sendCommentReply(commentId: number, reply: string, category?: string) {
  const [c] = await db.select().from(socialComments).where(eq(socialComments.id, commentId));
  if (!c) return;
  try {
    await replyToComment(c.platform as 'facebook' | 'instagram', c.externalId, reply);
    await db.update(socialComments).set({ reply, category: category ?? c.category, status: 'replied', repliedAt: new Date(), error: null, updatedAt: new Date() })
      .where(eq(socialComments.id, commentId));
  } catch (e) {
    await db.update(socialComments).set({ reply, category: category ?? c.category, status: 'failed', error: (e as Error).message, updatedAt: new Date() })
      .where(eq(socialComments.id, commentId));
  }
}

/** Used by the daily cron: plan, announce, publish. */
export async function runMarketingCycle() {
  const announced = await announcePendingOffers();
  const planned = await planUpcomingPosts();
  const published = await publishDuePosts(5, 60);
  return { announced, planned, published };
}
