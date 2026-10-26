import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Facebook Page + Instagram professional account via the Meta Graph API.
const VERSION = process.env.META_GRAPH_VERSION || 'v23.0';
// META_GRAPH_URL is only for tests (points at a local stand-in for Meta).
const GRAPH = `${process.env.META_GRAPH_URL || 'https://graph.facebook.com'}/${VERSION}`;

export const metaConfig = () => ({
  pageId: process.env.META_PAGE_ID,
  pageToken: process.env.META_PAGE_ACCESS_TOKEN,
  igUserId: process.env.META_IG_USER_ID,
});
export const facebookReady = () => !!(metaConfig().pageId && metaConfig().pageToken);
export const instagramReady = () => !!(metaConfig().igUserId && metaConfig().pageToken);

async function graph<T>(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const body = new URLSearchParams({ ...params, access_token: metaConfig().pageToken! });
  const res = await fetch(method === 'GET' ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`, {
    method, body: method === 'POST' ? body : undefined, signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta API error ${res.status}`);
  return data as T;
}

export async function postToFacebook(caption: string, imageUrl: string) {
  const r = await graph<{ id: string; post_id?: string }>(`${metaConfig().pageId}/photos`, { url: imageUrl, caption });
  return r.post_id ?? r.id;
}

export async function postToInstagram(caption: string, imageUrl: string) {
  const ig = metaConfig().igUserId;
  const container = await graph<{ id: string }>(`${ig}/media`, { image_url: imageUrl, caption });
  // Instagram processes the image before it can be published.
  for (let i = 0; i < 10; i++) {
    const s = await graph<{ status_code: string }>(container.id, { fields: 'status_code' }, 'GET');
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('Instagram could not process the image.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  const published = await graph<{ id: string }>(`${ig}/media_publish`, { creation_id: container.id });
  return published.id;
}

export async function replyToComment(platform: 'facebook' | 'instagram', commentId: string, message: string) {
  if (platform === 'facebook') return (await graph<{ id: string }>(`${commentId}/comments`, { message })).id;
  return (await graph<{ id: string }>(`${commentId}/replies`, { message })).id;
}

/** Verifies Meta's X-Hub-Signature-256 header on webhook deliveries. */
export function verifyMetaSignature(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}
