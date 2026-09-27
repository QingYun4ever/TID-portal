/* =============================================================================
 * 认证与权限
 *  - 密码: node:crypto scrypt（见 db.ts）
 *  - 令牌: 自签名 JWT(HS256)，零依赖
 *  - 角色: superadmin > admin > member > student
 * ========================================================================== */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { get } from './db.ts';
const SECRET = process.env.JWT_SECRET || 'sti-portal-dev-secret-change-me';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64uDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
export function signToken(user) {
    const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64u(JSON.stringify({
        sub: user.id,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    }));
    const sig = b64u(createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
    return `${header}.${payload}.${sig}`;
}
export function verifyToken(token) {
    if (!token)
        return null;
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    const [header, payload, sig] = parts;
    const expect = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest();
    const got = b64uDecode(sig);
    if (expect.length !== got.length || !timingSafeEqual(expect, got))
        return null;
    try {
        const data = JSON.parse(b64uDecode(payload).toString('utf8'));
        if (!data.exp || data.exp * 1000 < Date.now())
            return null;
        return data;
    }
    catch {
        return null;
    }
}
export function readToken(c) {
    const h = c.req.header('authorization') || c.req.header('Authorization');
    if (h?.startsWith('Bearer '))
        return verifyToken(h.slice(7).trim());
    const cookie = c.req.header('cookie');
    if (cookie) {
        const m = /(?:^|;\s*)sti_token=([^;]+)/.exec(cookie);
        if (m)
            return verifyToken(decodeURIComponent(m[1]));
    }
    return null;
}
export function currentUser(c) {
    const p = readToken(c);
    if (!p)
        return null;
    const row = get('SELECT * FROM users WHERE id=? AND isActive=1', [p.sub]);
    if (!row)
        return null;
    delete row.passwordHash;
    return { ...row, isActive: !!row.isActive };
}
const RANK = { student: 0, member: 1, admin: 2, superadmin: 3 };
export const atLeast = (role, min) => !!role && RANK[role] >= RANK[min];
/* --------------------------- Hono 中间件 ---------------------------------- */
export function optionalAuth() {
    return async (c, next) => {
        c.set('user', currentUser(c));
        await next();
    };
}
/** 需要登录 */
export function requireAuth(min = 'student') {
    return async (c, next) => {
        const user = currentUser(c);
        if (!user)
            return c.json({ error: '请先登录', code: 'UNAUTHORIZED' }, 401);
        if (!atLeast(user.role, min))
            return c.json({ error: '权限不足', code: 'FORBIDDEN' }, 403);
        c.set('user', user);
        await next();
    };
}
