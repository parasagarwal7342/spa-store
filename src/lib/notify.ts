import 'server-only';

/** Optional instant alert (Slack/Discord incoming webhook). Never blocks or fails the request. */
export async function notifyTeam(text: string) {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.warn('notify failed', e);
  }
}
