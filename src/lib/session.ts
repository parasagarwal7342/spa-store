import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@/db/schema';

// Edge-safe: used by middleware and server code alike.
export const SESSION_COOKIE = 'spa_session';
export const SESSION_DAYS = 30;

export interface SessionPayload { uid: number; role: Role; name: string }

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set (at least 32 characters).');
  return new TextEncoder().encode('dev-only-secret-change-me-dev-only-secret');
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ role: p.role, name: p.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(p.uid))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return { uid: Number(payload.sub), role: payload.role as Role, name: String(payload.name ?? '') };
  } catch {
    return null;
  }
}
