/* =============================================================================
 * 后台页面登录态自检（Chrome DevTools Protocol）
 *
 * 背景：scripts/browser.mjs 的 --eval 会在截图前触发 location.reload()，
 *       导致 Page.captureScreenshot 超时。本脚本改为「先登录注入令牌 → 再逐个
 *       路由导航」，因此可以在登录态下逐页收集 JS 异常 / 控制台错误 / 截图。
 *
 * 用法:
 *   node scripts/admin-check.mjs
 *   node scripts/admin-check.mjs --routes /admin,/admin/users --wait 3000
 *   node scripts/admin-check.mjs --user admin --pass admin123 --width 1600
 * ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const DEFAULT_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/settings',
  '/admin/logs',
  '/admin/members',
  '/admin/about',
  '/admin/status',
  '/admin/changelog',
];

function parseArgs(argv) {
  const a = {
    origin: 'http://127.0.0.1:5273',
    user: 'admin',
    pass: 'admin123',
    routes: DEFAULT_ROUTES,
    width: 1600,
    height: 1000,
    wait: 3200,
    outDir: 'scripts',
    quiet: false,
    scrolls: 0,
    full: false,
    evalAfter: '',
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--origin') a.origin = v;
    else if (k === '--user') a.user = v;
    else if (k === '--pass') a.pass = v;
    else if (k === '--routes') a.routes = String(v).split(',').filter(Boolean);
    else if (k === '--width') a.width = Number(v);
    else if (k === '--height') a.height = Number(v);
    else if (k === '--wait') a.wait = Number(v);
    else if (k === '--out-dir') a.outDir = v;
    else if (k === '--scrolls') a.scrolls = Number(v);
    else if (k === '--eval-after') a.evalAfter = v;
    else if (k === '--full') a.full = true;
    else if (k === '--quiet') a.quiet = true;
    else continue;
    i++;
  }
  return a;
}

const args = parseArgs(process.argv);
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('no chrome/edge found');
  process.exit(1);
}

const port = 9600 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-admin-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${args.width},${args.height}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore'] }
);

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {
      /* retry */
    }
    await sleep(150);
  }
  throw new Error('chrome devtools 未就绪');
}

let msgId = 0;
function rpc(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    const onMsg = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.id === id) {
        ws.removeEventListener('message', onMsg);
        if (data.error) reject(new Error(`${method}: ${data.error.message}`));
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(payload));
    setTimeout(() => {
      ws.removeEventListener('message', onMsg);
      reject(new Error(`${method} 超时`));
    }, 45000);
  });
}

let currentRoute = '(boot)';
const logs = new Map(); // route -> { errors: [], exceptions: [], failed: [] }
function bucket(route) {
  if (!logs.has(route)) logs.set(route, { errors: [], exceptions: [], failed: [] });
  return logs.get(route);
}

let exitCode = 0;
try {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });

  ws.addEventListener('message', (ev) => {
    let d;
    try {
      d = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (d.sessionId !== sessionId) return;
    const m = d.method;
    const b = bucket(currentRoute);
    if (m === 'Runtime.consoleAPICalled') {
      if (d.params.type !== 'error' && d.params.type !== 'warning') return;
      const text = (d.params.args || [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? a.type)
        .join(' ');
      if (d.params.type === 'error') b.errors.push(text);
    } else if (m === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails;
      b.exceptions.push(e.exception?.description || e.text);
    } else if (m === 'Log.entryAdded') {
      if (d.params.entry.level === 'error') b.errors.push(`[${d.params.entry.source}] ${d.params.entry.text}`);
    } else if (m === 'Network.loadingFailed') {
      if (['Fetch', 'XHR', 'Script', 'Stylesheet'].includes(d.params.type))
        b.failed.push(`${d.params.type} ${d.params.errorText}`);
    }
  });

  await rpc(ws, 'Runtime.enable', {}, sessionId);
  await rpc(ws, 'Log.enable', {}, sessionId);
  await rpc(ws, 'Page.enable', {}, sessionId);
  await rpc(ws, 'Network.enable', {}, sessionId);
  await rpc(
    ws,
    'Emulation.setDeviceMetricsOverride',
    { width: args.width, height: args.height, deviceScaleFactor: 1, mobile: args.width < 700 },
    sessionId
  );

  /* ---------------- 1. 打开站点并注入登录令牌 ---------------- */
  currentRoute = '(login)';
  await rpc(ws, 'Page.navigate', { url: args.origin + '/' }, sessionId);
  await sleep(2200);
  const login = await rpc(
    ws,
    'Runtime.evaluate',
    {
      expression: `fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:${JSON.stringify(
        args.user
      )},password:${JSON.stringify(args.pass)}})}).then(r=>r.json()).then(j=>{localStorage.setItem('sti_token',j.data.token);return j.data.user.name+' / '+j.data.user.role})`,
      returnByValue: true,
      awaitPromise: true,
    },
    sessionId
  );
  if (login.exceptionDetails) throw new Error('登录注入失败：' + (login.exceptionDetails.exception?.description || login.exceptionDetails.text));
  if (!args.quiet) console.log(`LOGIN   : ${login.result.value}  (${args.origin})\n`);

  fs.mkdirSync(args.outDir, { recursive: true });

  /* ---------------- 2. 逐路由导航、截图、收集异常 ---------------- */
  for (const route of args.routes) {
    currentRoute = route;
    bucket(route);
    await rpc(ws, 'Page.navigate', { url: args.origin + route }, sessionId);
    await sleep(args.wait);

    // 依次滚动触发滚动揭示（[data-reveal] → .is-in），最后回到顶部
    if (args.scrolls > 0) {
      const hRes = await rpc(ws, 'Runtime.evaluate', { expression: 'document.body.scrollHeight', returnByValue: true }, sessionId);
      const h = hRes.result?.value ?? 0;
      for (let i = 1; i <= args.scrolls; i++) {
        await rpc(
          ws,
          'Runtime.evaluate',
          { expression: `window.scrollTo(0, ${Math.round((h * i) / (args.scrolls + 1))})`, returnByValue: true },
          sessionId
        );
        await sleep(650);
      }
      await rpc(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0,0)', returnByValue: true }, sessionId);
      await sleep(450);
    }

    if (args.evalAfter) {
      const r = await rpc(ws, 'Runtime.evaluate', { expression: args.evalAfter, returnByValue: true, awaitPromise: true }, sessionId);
      if (r.exceptionDetails) bucket(route).exceptions.push('eval-after: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      await sleep(900);
    }

    const shot = await rpc(
      ws,
      'Page.captureScreenshot',
      { format: 'png', fromSurface: true, captureBeyondViewport: args.full },
      sessionId
    );
    const file = path.join(args.outDir, `_chk${route.replace(/\//g, '_')}.png`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));

    const info = await rpc(
      ws,
      'Runtime.evaluate',
      {
        expression: `JSON.stringify({title:document.title,root:document.getElementById('root')?.children.length??-1,h:document.body.scrollHeight,rows:document.querySelectorAll('table tbody tr').length,tiles:document.querySelectorAll('main .mono').length,text:(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,260)})`,
        returnByValue: true,
      },
      sessionId
    );
    const meta = JSON.parse(info.result.value);
    const b = bucket(route);
    const bad = b.errors.length + b.exceptions.length + b.failed.length;
    if (bad) exitCode = 1;
    console.log(`ROUTE   : ${route}`);
    console.log(`  TITLE : ${meta.title}`);
    console.log(`  ROOT  : ${meta.root} children · ${meta.h}px · 表格行 ${meta.rows}`);
    console.log(`  TEXT  : ${JSON.stringify(meta.text)}`);
    console.log(`  SHOT  : ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
    if (meta.root <= 0) {
      console.log('  !! ROOT children = 0');
      exitCode = 1;
    }
    if (b.exceptions.length) {
      console.log(`  !! EXCEPTIONS (${b.exceptions.length})`);
      b.exceptions.slice(0, 5).forEach((e) => console.log('     ' + String(e).split('\n').slice(0, 3).join('\n     ')));
    }
    if (b.errors.length) {
      console.log(`  !! CONSOLE ERRORS (${b.errors.length})`);
      b.errors.slice(0, 8).forEach((e) => console.log('     ' + String(e).slice(0, 300)));
    }
    if (b.failed.length) {
      console.log(`  !! FAILED REQUESTS (${[...new Set(b.failed)].length})`);
      [...new Set(b.failed)].slice(0, 6).forEach((e) => console.log('     ' + e));
    }
    if (!bad && meta.root > 0) console.log('  OK    : 无 JS 异常 / 控制台错误');
    console.log('');
  }
} catch (e) {
  console.error('DRIVER ERROR:', e.message);
  exitCode = 2;
} finally {
  proc.kill();
  await sleep(250);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  process.exitCode = exitCode;
}
