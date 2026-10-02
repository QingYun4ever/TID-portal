/* =============================================================================
 * 认证 / 用户中心  /api/auth/*
 * ========================================================================== */
import { createHash, randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import * as oidc from 'openid-client';
import { all, get, insert, run, boolFields } from '../db.ts';
import { ok, readBody, pick, logOp } from '../util.ts';
import { signToken, currentUser, requireAuth, publicUser, SESSION_COOKIE, SESSION_TTL_SECONDS } from '../auth.ts';

const ISSUER = 'https://auth.cjlwall.cc/application/o/home/';
const FLOW_COOKIE = '__Secure-sti_oidc_flow';
const FLOW_TTL_SECONDS = 10 * 60;
const FAILED_LOGIN = '/login?error=oidc_failed';

interface OidcSettings { clientId: string; clientSecret: string; redirectUri: string; callback: URL }

function settings(): OidcSettings {
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and OIDC_REDIRECT_URI are required');
  }
  let callback: URL;
  try { callback = new URL(redirectUri); } catch { throw new Error('OIDC_REDIRECT_URI must be an absolute HTTPS URL'); }
  if ((callback.protocol !== 'https:' && !(callback.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(callback.hostname))) ||
      callback.pathname !== '/api/auth/oidc/callback' || callback.search || callback.hash ||
      callback.username || callback.password) {
    throw new Error('OIDC_REDIRECT_URI must point to /api/auth/oidc/callback on HTTPS (or local loopback HTTP)');
  }
  return { clientId, clientSecret, redirectUri, callback };
}

let discovered: Promise<oidc.Configuration> | undefined;
function provider(config: OidcSettings): Promise<oidc.Configuration> {
  if (!discovered) {
    discovered = oidc.discovery(new URL(ISSUER), config.clientId,
      { client_secret: config.clientSecret }, oidc.ClientSecretBasic(), { timeout: 10 });
    discovered.catch(() => { discovered = undefined; });
  }
  return discovered;
}

function localPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/.test(value) || /%(?:2f|5c)/i.test(value)) return '/';
  try {
    const parsed = new URL(value, 'https://portal.invalid');
    return parsed.origin === 'https://portal.invalid' ? value : '/';
  } catch { return '/'; }
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export const authRoutes = new Hono();

authRoutes.get('/oidc/start', async (c) => {
  let config: OidcSettings;
  try { config = settings(); } catch (error) {
    return c.json({ ok: false, error: (error as Error).message, code: 'OIDC_CONFIGURATION' }, 503);
  }
  try {
    const client = await provider(config);
    const state = oidc.randomState();
    const verifier = oidc.randomPKCECodeVerifier();
    const nonce = oidc.randomNonce();
    const browserSecret = randomBytes(32).toString('base64url');
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    const authorization = oidc.buildAuthorizationUrl(client, {
      redirect_uri: config.redirectUri, scope: 'openid email profile',
      state, nonce, code_challenge: challenge, code_challenge_method: 'S256',
    });
    run('DELETE FROM oidc_login_flows WHERE expiresAt<=?', [Date.now()]);
    insert('oidc_login_flows', {
      stateHash: digest(state), browserHash: digest(browserSecret), codeVerifier: verifier,
      nonce, redirectPath: localPath(c.req.query('redirect')),
      expiresAt: Date.now() + FLOW_TTL_SECONDS * 1000,
    });
    setCookie(c, FLOW_COOKIE, browserSecret, {
      path: '/api/auth/oidc/callback', httpOnly: true, secure: true, sameSite: 'Lax',
      maxAge: FLOW_TTL_SECONDS,
    });
    return c.redirect(authorization.toString(), 302);
  } catch {
    return c.redirect(FAILED_LOGIN, 302);
  }
});

authRoutes.get('/oidc/callback', async (c) => {
  const browserSecret = getCookie(c, FLOW_COOKIE);
  deleteCookie(c, FLOW_COOKIE, { path: '/api/auth/oidc/callback', secure: true, httpOnly: true, sameSite: 'Lax' });
  try {
    const config = settings();
    const callback = new URL(c.req.url);
    if (callback.host !== config.callback.host || callback.pathname !== config.callback.pathname ||
        !['http:', 'https:'].includes(callback.protocol) ||
        callback.searchParams.getAll('state').length !== 1 || !browserSecret ||
        browserSecret.length > 128) return c.redirect(FAILED_LOGIN, 302);
    const registeredCallback = new URL(config.redirectUri);
    registeredCallback.search = callback.search;
    const state = callback.searchParams.get('state')!;
    const flow = get<{ codeVerifier: string; nonce: string; redirectPath: string }>(
      'DELETE FROM oidc_login_flows WHERE stateHash=? AND browserHash=? AND expiresAt>? RETURNING codeVerifier,nonce,redirectPath',
      [digest(state), digest(browserSecret), Date.now()]);
    if (!flow || callback.searchParams.getAll('code').length !== 1 ||
        callback.searchParams.has('error')) return c.redirect(FAILED_LOGIN, 302);

    const client = await provider(config);
    const tokens = await oidc.authorizationCodeGrant(client, registeredCallback, {
      pkceCodeVerifier: flow.codeVerifier, expectedState: state, expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims || claims.iss !== ISSUER || typeof claims.sub !== 'string' || !claims.sub) {
      return c.redirect(FAILED_LOGIN, 302);
    }
    const info = await oidc.fetchUserInfo(client, tokens.access_token, claims.sub);
    const identity = { oidcIssuer: claims.iss, oidcSubject: claims.sub };
    let user = get<Record<string, any>>('SELECT * FROM users WHERE oidcIssuer=? AND oidcSubject=?',
      [identity.oidcIssuer, identity.oidcSubject]);
    if (!user) {
      const username = 'oidc-' + digest(`${claims.iss}\0${claims.sub}`);
      const name = typeof info.name === 'string' && info.name.trim() ? info.name.trim() :
        typeof info.preferred_username === 'string' && info.preferred_username.trim() ? info.preferred_username.trim() : username;
      const id = insert('users', {
        username, passwordHash: '!', name, role: process.env.OIDC_SUPERADMIN_SUB === claims.sub ? 'superadmin' : 'student',
        email: typeof info.email === 'string' ? info.email : null,
        ...identity,
      });
      insert('user_messages', {
        userId: id, title: '欢迎加入科技创新部门户',
        content: '完善个人资料后即可在线报名活动、提交项目申报。如有疑问可在「互动与反馈」留言。',
      });
      user = get<Record<string, any>>('SELECT * FROM users WHERE id=?', [id]);
    }
    if (!user?.isActive) return c.redirect(FAILED_LOGIN, 302);
    if (process.env.OIDC_SUPERADMIN_SUB === claims.sub && user.role !== 'superadmin') {
      run('UPDATE users SET role=? WHERE id=?', ['superadmin', user.id]);
    }
    run('UPDATE users SET lastLoginAt=? WHERE id=?', [new Date().toLocaleString('sv-SE').replace('T', ' '), user.id]);
    logOp({ userId: user.id, userName: user.name, action: '登录', target: 'auth', detail: 'OIDC 登录成功', ip: clientIp(c) });
    setCookie(c, SESSION_COOKIE, signToken({ id: user.id, ...identity }), {
      path: '/', httpOnly: true, secure: true, sameSite: 'Lax', maxAge: SESSION_TTL_SECONDS,
    });
    return c.redirect(localPath(flow.redirectPath), 302);
  } catch {
    return c.redirect(FAILED_LOGIN, 302);
  }
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/', httpOnly: true, secure: true, sameSite: 'Lax' });
  return ok(c, { loggedOut: true });
});

authRoutes.get('/me', (c) => {
  const user = currentUser(c);
  if (!user) return ok(c, null);
  const unread = get<{ c: number }>('SELECT COUNT(*) c FROM user_messages WHERE userId=? AND read=0', [user.id])!.c;
  const stats = {
    signups: get<{ c: number }>('SELECT COUNT(*) c FROM activity_signups WHERE userId=?', [user.id])!.c,
    applications: get<{ c: number }>('SELECT COUNT(*) c FROM project_applications WHERE userId=?', [user.id])!.c,
    joinApplications: get<{ c: number }>('SELECT COUNT(*) c FROM join_applications WHERE userId=?', [user.id])!.c,
    feedback: get<{ c: number }>('SELECT COUNT(*) c FROM feedback WHERE userId=?', [user.id])!.c,
    unread,
  };
  return ok(c, { user, stats });
});

authRoutes.patch('/me', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const body = await readBody<any>(c);
  const data = pick(body, ['name', 'email', 'phone', 'avatar', 'studentId', 'college']);
  if (Object.keys(data).length) {
    run(
      `UPDATE users SET ${Object.keys(data)
        .map((k) => `"${k}"=?`)
        .join(',')} WHERE id=?`,
      [...Object.values(data), user.id]
    );
  }
  const row = get<any>('SELECT * FROM users WHERE id=?', [user.id]);
  return ok(c, publicUser(row));
});


/* ------------------------------ 我的数据 -------------------------------- */
authRoutes.get('/my/signups', requireAuth(), (c) => {
  const user = c.get('user')!;
  const items = all(
    `SELECT s.id, s.checkedIn, s.createdAt, a.title, a.slug, a.startAt, a.endAt, a.location, a.cover, a.status
     FROM activity_signups s JOIN activities a ON a.id=s.activityId
     WHERE s.userId=? ORDER BY datetime(a.startAt) DESC`,
    [user.id]
  ).map((r: any) => boolFields(r, ['checkedIn']));
  return ok(c, items);
});

authRoutes.get('/my/applications', requireAuth(), (c) => {
  const user = c.get('user')!;
  const items = all(
    `SELECT pa.*, c2.title AS competitionTitle FROM project_applications pa
     LEFT JOIN competitions c2 ON c2.id=pa.competitionId
     WHERE pa.userId=? ORDER BY datetime(pa.createdAt) DESC`,
    [user.id]
  ).map((r: any) => ({ ...r, members: safeJson(r.members), materials: safeJson(r.materials) }));
  return ok(c, items);
});

authRoutes.get('/my/join-applications', requireAuth(), (c) => {
  const user = c.get('user')!;
  const items = all(
    `SELECT ja.*, jp.name AS positionName FROM join_applications ja
     LEFT JOIN join_positions jp ON jp.id=ja.positionId
     WHERE ja.userId=? ORDER BY datetime(ja.createdAt) DESC`,
    [user.id]
  );
  return ok(c, items);
});

authRoutes.get('/my/feedback', requireAuth(), (c) => {
  const user = c.get('user')!;
  const items = all('SELECT * FROM feedback WHERE userId=? ORDER BY datetime(createdAt) DESC', [user.id]);
  return ok(c, items);
});

/* ------------------------------- 我的消息 ------------------------------- */
authRoutes.get('/messages', requireAuth(), (c) => {
  const user = c.get('user')!;
  const items = all('SELECT * FROM user_messages WHERE userId=? ORDER BY datetime(createdAt) DESC LIMIT 60', [
    user.id,
  ]).map((r: any) => ({ ...r, read: !!r.read }));
  const unread = items.filter((i: any) => !i.read).length;
  return ok(c, items, { unread });
});

authRoutes.post('/messages/read', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const body = await readBody<{ id?: number }>(c);
  if (body.id) run('UPDATE user_messages SET read=1 WHERE id=? AND userId=?', [body.id, user.id]);
  else run('UPDATE user_messages SET read=1 WHERE userId=?', [user.id]);
  return ok(c, { read: true });
});

authRoutes.delete('/messages/:id', requireAuth(), (c) => {
  const user = c.get('user')!;
  run('DELETE FROM user_messages WHERE id=? AND userId=?', [Number(c.req.param('id')), user.id]);
  return ok(c, { deleted: true });
});

/* -------------------------------- 工具 --------------------------------- */
function safeJson(s: any) {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
function clientIp(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    '127.0.0.1'
  );
}

/* ---------------------- 组队申请 / 指导老师预约 -------------------------- */
authRoutes.get('/teammates', requireAuth(), (c) => {
  const user = c.get('user')!;
  // 简化实现：推荐同学段、可组队的在册用户
  const items = all(
    `SELECT id,name,college,studentId FROM users
     WHERE role='student' AND isActive=1 AND id<>? ORDER BY id DESC LIMIT 24`,
    [user.id]
  );
  return ok(c, items);
});

authRoutes.get('/advisors', (c) => {
  const items = all(
    `SELECT id,name,role,avatar,bio,tags FROM members WHERE role LIKE '%老师%' OR "group"='教师' OR role LIKE '%指导%' LIMIT 12`
  ).map((m: any) => safeJson2(m));
  return ok(c, items);
});
function safeJson2(m: any) {
  try {
    return { ...m, tags: JSON.parse(m.tags || '[]') };
  } catch {
    return { ...m, tags: [] };
  }
}
