/* =============================================================================
 * 批量页面健康检查（单浏览器会话，避免每页都启动一次 Chrome）
 *
 * 用法:
 *   node scripts/check.mjs                      # 检查默认路由表
 *   node scripts/check.mjs --base http://127.0.0.1:8787 --token <jwt>
 *   node scripts/check.mjs /news /gallery        # 只检查指定路径
 *
 * 比「每页启动一次 Chrome」快 10 倍以上。
 * ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const BASE = opt('--base', 'http://127.0.0.1:8787');
const TOKEN = opt('--token', '');
const PATHS = argv.filter((a) => a.startsWith('/'));

const DEFAULT_PATHS = [
  '/',
  '/about',
  '/news',
  '/activities',
  '/projects',
  '/projects/apply',
  '/competitions',
  '/resources',
  '/gallery',
  '/join',
  '/feedback',
  '/status',
  '/changelog',
  '/search',
  '/login',
  '/register',
  '/404',
];

const ADMIN_PATHS = ['/admin', '/admin/articles', '/admin/signups', '/admin/gallery', '/admin/users', '/admin/settings', '/account', '/account/messages'];

const TARGETS = PATHS.length ? PATHS : [...DEFAULT_PATHS, ...(TOKEN ? ADMIN_PATHS : [])];

if (!CHROME) {
  console.error('未找到 Chrome / Edge');
  process.exit(1);
}

const port = 9500 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-'));
const proc = spawn(
  CHROME,
  ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
   `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,960', 'about:blank'],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const rpc = (ws, method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    const onMsg = (ev) => {
      let d;
      try { d = JSON.parse(ev.data); } catch { return; }
      if (d.id !== mid) return;
      ws.removeEventListener('message', onMsg);
      d.error ? reject(new Error(d.error.message)) : resolve(d.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(sid ? { id: mid, method, params, sessionId: sid } : { id: mid, method, params }));
    setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error(method + ' timeout')); }, 20000);
  });

try {
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(150); }
  }
  if (!wsUrl) throw new Error('devtools 未就绪');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });

  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });

  let errs = [];
  ws.addEventListener('message', (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (d.sessionId !== sid) return;
    if (d.method === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails;
      errs.push(String(e.exception?.description || e.text).split('\n')[0].slice(0, 220));
    } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      errs.push((d.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 220));
    }
  });

  await rpc(ws, 'Runtime.enable', {}, sid);
  await rpc(ws, 'Page.enable', {}, sid);

  if (TOKEN) {
    await rpc(ws, 'Page.addScriptToEvaluateOnNewDocument',
      { source: `try{localStorage.setItem('sti_token', ${JSON.stringify(TOKEN)})}catch(e){}` }, sid);
  }

  const rows = [];
  for (const p of TARGETS) {
    errs = [];
    try {
      await rpc(ws, 'Page.navigate', { url: BASE + p }, sid);
    } catch { /* 导航会打断上一个上下文，忽略 */ }
    await sleep(1150);
    let info = { root: -1, h: 0 };
    try {
      const r = await rpc(ws, 'Runtime.evaluate', {
        expression: `JSON.stringify({root: document.getElementById('root')?.children.length ?? -1, h: document.body.scrollHeight})`,
        returnByValue: true,
      }, sid);
      info = JSON.parse(r.result.value || '{}');
    } catch { /* ignore */ }
    rows.push({ p, errs: [...new Set(errs)], ...info });
  }

  const bad = rows.filter((r) => r.errs.length || r.root <= 0);
  for (const r of rows) {
    const tag = r.errs.length || r.root <= 0 ? 'FAIL' : 'OK  ';
    console.log(`[${tag}] ${r.p.padEnd(22)} root=${String(r.root).padStart(2)}  h=${String(r.h).padStart(6)}px  ${r.errs[0] || ''}`);
  }
  console.log('');
  console.log(bad.length ? `✗ ${bad.length} / ${rows.length} 个页面有问题` : `✓ 全部 ${rows.length} 个页面正常（无 JS 异常）`);
  process.exitCode = bad.length ? 1 : 0;
} catch (e) {
  console.error('CHECK ERROR:', e.message);
  process.exitCode = 2;
} finally {
  proc.kill();
  await sleep(200);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
