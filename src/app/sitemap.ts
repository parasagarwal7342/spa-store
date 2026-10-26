import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db, products } from '@/db';
import { BRANDS, SITE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.active, true));
  const pages = ['', '/shop', '/bulk-orders', '/contact', '/about', '/warranty', '/policies', '/track'];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 })),
    ...BRANDS.map((b) => ({ url: `${SITE.url}/shop?brand=${b.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...items.map((i) => ({ url: `${SITE.url}/p/${i.slug}`, lastModified: i.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
}
