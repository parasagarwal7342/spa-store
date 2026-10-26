import { NextResponse } from 'next/server';
import { releaseAbandonedOrders } from '@/lib/orders';
import { runMarketingCycle } from '@/lib/marketing';

export const maxDuration = 300;

// Called by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await releaseAbandonedOrders();
  return NextResponse.json(await runMarketingCycle());
}
