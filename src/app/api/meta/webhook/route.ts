import { NextResponse, after } from 'next/server';
import { handleIncomingComment } from '@/lib/marketing';
import { metaConfig, verifyMetaSignature } from '@/lib/meta';

// Meta calls GET once to verify the webhook URL.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') && q.get('hub.verify_token') === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

type Change = { field: string; value: Record<string, any> };

// New comments on our Facebook Page and Instagram posts.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'))) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  const body = JSON.parse(raw) as { object: string; entry?: { id: string; changes?: Change[] }[] };
  const { pageId, igUserId } = metaConfig();
  const jobs: Parameters<typeof handleIncomingComment>[0][] = [];

  for (const entry of body.entry ?? []) {
    for (const ch of entry.changes ?? []) {
      const v = ch.value;
      if (body.object === 'page' && ch.field === 'feed' && v.item === 'comment' && v.verb === 'add' && v.message) {
        if (v.from?.id === pageId) continue; // our own replies
        jobs.push({ platform: 'facebook', externalId: v.comment_id, postExternalId: v.post_id, authorName: v.from?.name, text: v.message });
      }
      if (body.object === 'instagram' && ch.field === 'comments' && v.text) {
        if (v.from?.id === igUserId) continue;
        jobs.push({ platform: 'instagram', externalId: v.id, postExternalId: v.media?.id, authorName: v.from?.username, text: v.text });
      }
    }
  }
  // Reply after acknowledging, so Meta doesn't time out and retry.
  after(async () => { for (const j of jobs) await handleIncomingComment(j); });
  return NextResponse.json({ ok: true });
}
