import 'server-only';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { cache } from 'react';
import { db, products, type Product } from '@/db';
import { BRANDS } from './site';

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'discount' | 'newest';

export interface ShopFilters { q?: string; brand?: string; category?: string; sort?: SortKey; inStock?: boolean }

export const brandFromSlug = (slug?: string) => BRANDS.find((b) => b.slug === slug)?.name;

export async function listProducts(f: ShopFilters = {}): Promise<Product[]> {
  const where: SQL[] = [eq(products.active, true)];
  const brand = brandFromSlug(f.brand);
  if (brand) where.push(eq(products.brand, brand));
  if (f.category) where.push(eq(products.category, f.category));
  if (f.inStock) where.push(sql`(${products.stock} IS NULL OR ${products.stock} > 0)`);
  if (f.q?.trim()) {
    const term = `%${f.q.trim().replace(/[%_]/g, '')}%`;
    where.push(or(ilike(products.name, term), ilike(products.category, term), ilike(products.sku, term), ilike(products.brand, term), ilike(products.description, term))!);
  }
  const soldOutLast = sql`(${products.stock} = 0)`;
  const order = {
    featured: [asc(soldOutLast), desc(products.featured), asc(products.id)],
    'price-asc': [asc(products.price)],
    'price-desc': [desc(products.price)],
    discount: [desc(sql`CASE WHEN ${products.mrp} > ${products.price} THEN (${products.mrp} - ${products.price})::float / ${products.mrp} ELSE 0 END`)],
    newest: [desc(products.createdAt)],
  }[f.sort ?? 'featured'] ?? [asc(products.id)];
  return db.select().from(products).where(and(...where)).orderBy(...order);
}

export const getProductBySlug = cache(async (slug: string) => {
  const [p] = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.active, true)));
  return p ?? null;
});

export async function listCategories(brandSlug?: string) {
  const brand = brandFromSlug(brandSlug);
  return db.select({ category: products.category, count: sql<number>`count(*)::int` }).from(products)
    .where(and(eq(products.active, true), brand ? eq(products.brand, brand) : undefined))
    .groupBy(products.category).orderBy(asc(products.category));
}

export async function relatedProducts(p: Product, limit = 4) {
  return db.select().from(products)
    .where(and(eq(products.active, true), eq(products.category, p.category), sql`${products.id} <> ${p.id}`, sql`(${products.stock} IS NULL OR ${products.stock} > 0)`))
    .orderBy(desc(products.featured)).limit(limit);
}
