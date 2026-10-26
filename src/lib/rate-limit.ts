import 'server-only';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db, rateLimits } from '@/db';

export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'unknown').trim();
}

/** Returns false when `key` has been used more than `max` times in the window. Shared across serverless instances. */
export async function allow(key: string, max: number, windowSeconds: number) {
  const [row] = await db.insert(rateLimits)
    .values({ key, count: 1, resetAt: sql`now() + make_interval(secs => ${windowSeconds})` })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} < now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} < now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= max;
}
