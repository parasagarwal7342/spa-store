import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { coupons, db, products } from '@/db';
import { displayName, inr, percentOff } from '@/lib/format';
import { SITE } from '@/lib/site';

export const runtime = 'nodejs';

// Branded 1080×1080 JPEG for Instagram/Facebook posts (Instagram only accepts JPEG).
async function asDataUrl(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(900, 900, { fit: 'inside' }).flatten({ background: '#ffffff' }).jpeg().toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const productId = Number(q.get('product'));
  const [p] = Number.isInteger(productId) && productId > 0 ? await db.select().from(products).where(eq(products.id, productId)) : [];
  const code = q.get('code');
  const [c] = code ? await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())) : [];
  const photo = p?.images[0] ? await asDataUrl(p.images[0]) : null;
  const headline = (q.get('headline') || (c ? `${c.percentOff}% OFF` : p ? displayName(p.name) : SITE.shortName)).slice(0, 60);
  const off = p ? percentOff(p.price, p.mrp) : 0;
  const host = SITE.url.replace(/^https?:\/\//, '');

  const png = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f7f5f0', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#ffffff', margin: 48, marginBottom: 0, borderRadius: 40, position: 'relative' }}>
          {photo ? <img src={photo} width={620} height={620} style={{ objectFit: 'contain' }} alt="" /> : <div style={{ fontSize: 110, fontWeight: 800, color: '#14161b' }}>{c ? `${c.percentOff}% OFF` : 'SPA'}</div>}
          {c && (
            <div style={{ position: 'absolute', top: 36, left: 36, display: 'flex', background: '#14161b', color: '#f7c241', padding: '14px 26px', borderRadius: 20, fontSize: 44, fontWeight: 800 }}>
              {`${c.percentOff}% OFF`}
            </div>
          )}
          {!c && off > 0 && (
            <div style={{ position: 'absolute', top: 36, left: 36, display: 'flex', background: '#14161b', color: '#f7c241', padding: '12px 22px', borderRadius: 18, fontSize: 36, fontWeight: 800 }}>{`${off}% OFF`}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 56px 44px' }}>
          <div style={{ fontSize: 54, fontWeight: 800, color: '#14161b', lineHeight: 1.1 }}>{headline}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            <div style={{ display: 'flex', fontSize: 32, color: '#3a3f4b' }}>
              {c ? `Use code ${c.code} at checkout${c.minOrder ? ` · above ${inr(c.minOrder)}` : ''}` : p ? `${inr(p.price)}${p.mrp && p.mrp > p.price ? `  (MRP ${inr(p.mrp)})` : ''}` : '100% original products'}
            </div>
            <div style={{ display: 'flex', background: '#f2b01e', color: '#14161b', padding: '12px 24px', borderRadius: 16, fontSize: 30, fontWeight: 800 }}>{host}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
}
