/* =============================================================================
 * OIDC-backed portal sessions and local role authorization
 * ========================================================================== */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { get } from './db.ts';
import type { Role, User } from '../shared/types.ts';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET is required for portal sessions');

export const SESSION_COOKIE = '__Host-sti_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_ISSUER = 'sti-portal:oidc-session-v1';

const b64u = (value: Buffer | string) => Buffer.from(value).toString('base64url');
const b64uDecode = (value: string) => Buffer.from(value, 'base64url');

interface SessionPayload {
  iss: typeof TOKEN_ISSUER;
  sub: number;
  oidcIssuer: string;
  oidcSubject: string;
  iat: number;
  exp: number;
}

export function signToken(user: { id: number; oidcIssuer: string; oidcSubject: string }): string {
  const issued = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64u(JSON.stringify({
    iss: TOKEN_ISSUER,
    sub: user.id,
    oidcIssuer: user.oidcIssuer,
    oidcSubject: user.oidcSubject,
    iat: issued,
    exp: issued + SESSION_TTL_SECONDS,
  } satisfies SessionPayload));
  const signature = b64u(createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest();
  const received = b64uDecode(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsedHeader = JSON.parse(b64uDecode(header).toString('utf8'));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
    const claims = JSON.parse(b64uDecode(payload).toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== TOKEN_ISSUER || !Number.isSafeInteger(claims.sub) || claims.sub <= 0 ||
        typeof claims.oidcIssuer !== 'string' || !claims.oidcIssuer ||
        typeof claims.oidcSubject !== 'string' || !claims.oidcSubject ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        claims.iat > now || claims.exp <= now || claims.exp - claims.iat !== SESSION_TTL_SECONDS) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Never expose password hashes or immutable external identity in API responses. */
export function publicUser(row: Record<string, any>): User {
  return {
    id: row.id, username: row.username, name: row.name, role: row.role,
    email: row.email, phone: row.phone, avatar: row.avatar,
    studentId: row.studentId, college: row.college,
    isActive: !!row.isActive, createdAt: row.createdAt,
  };
}

export function currentUser(c: Context): User | null {
  const session = verifyToken(getCookie(c, SESSION_COOKIE));
  if (!session) return null;
  const row = get('SELECT * FROM users WHERE id=? AND oidcIssuer=? AND oidcSubject=? AND isActive=1',
    [session.sub, session.oidcIssuer, session.oidcSubject]);
  return row ? publicUser(row) : null;
}

const RANK: Record<Role, number> = { student: 0, member: 1, admin: 2, superadmin: 3 };
export const atLeast = (role: Role | undefined, min: Role) => !!role && RANK[role] >= RANK[min];

export function optionalAuth() {
  return async (c: Context, next: Next) => {
    c.set('user', currentUser(c));
    await next();
  };
}

export function requireAuth(min: Role = 'student') {
  return async (c: Context, next: Next) => {
    const user = currentUser(c);
    if (!user) return c.json({ error: '请先登录', code: 'UNAUTHORIZED' }, 401);
    if (!atLeast(user.role, min)) return c.json({ error: '权限不足', code: 'FORBIDDEN' }, 403);
    c.set('user', user);
    await next();
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
  }
}
