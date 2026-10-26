// Loads the starting catalogue (only into an empty table) and creates/updates the owner login.
// Usage: DATABASE_URL=... OWNER_EMAIL=... OWNER_PASSWORD=... npm run db:seed
import { readFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { products, users } from '../src/db/schema';
import { productSlug } from '../src/lib/slug';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL');
const client = postgres(url, { max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });
const db = drizzle(client);

type CatalogItem = { sku: string; brand: string; category: string; name: string; description: string; highlights: string[]; images: string[]; price: number; mrp: number | null };

async function main() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  if (count === 0) {
    const catalog: CatalogItem[] = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
    await db.insert(products).values(catalog.map((p, i) => ({ ...p, slug: productSlug(p.name, p.sku), featured: i < 8 })));
    console.log(`Inserted ${catalog.length} products.`);
  } else {
    console.log(`Products table already has ${count} rows; catalogue not reloaded.`);
  }

  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error('OWNER_PASSWORD must be at least 10 characters.');
    const salt = randomBytes(16);
    const hash = `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
    await db.insert(users).values({ name: process.env.OWNER_NAME || 'SPA Owner', email: email.toLowerCase(), passwordHash: hash, role: 'owner' })
      .onConflictDoUpdate({ target: users.email, set: { role: 'owner', passwordHash: hash, updatedAt: new Date() } });
    console.log(`Owner login ready for ${email}.`);
  } else {
    console.log('OWNER_EMAIL / OWNER_PASSWORD not set: owner login unchanged.');
  }
  await client.end();
}

main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
