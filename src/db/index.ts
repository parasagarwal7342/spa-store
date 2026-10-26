import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set. See .env.example.');

// Reuse one small pool per server instance (and across hot reloads in dev).
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
const client = globalForDb.sql ?? postgres(url, {
  max: process.env.VERCEL ? 1 : 5,
  prepare: !/pooler|pgbouncer/.test(url),
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require',
});
if (process.env.NODE_ENV !== 'production') globalForDb.sql = client;

export const db = drizzle(client, { schema });
export * from './schema';
