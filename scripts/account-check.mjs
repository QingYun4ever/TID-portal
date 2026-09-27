/* 用法:
 *   node scripts/account-check.mjs                        # 全部路由
 *   ONLY="/account|/account/messages" node …              # 只跑部分路由
 *   SCRIPT=scripts/_acc-assert.js node …                  # 每页注入交互断言
 *   RESTORE_UNREAD=2 node …                               # 结束后把最近 2 条消息恢复为未读
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://127.0.0.1:5273';
const USER = { username: 'chenxi', password: 'sti123456' };
const WIDTH = Number(process.env.W || 1600);
const HEIGHT = Number(process.env.H || 1000);
const TAG = process.env.TAG || '';
/** 只跑部分路由：ONLY=/account|/account/messages */
const ONLY = (process.env.ONLY || '').split('|').filter(Boolean);
/** 每页导航后额外注入的脚本文件（内容为一段 JS 表达式，可 await） */
const SCRIPT_FILE = process.env.SCRIPT || '';
const EXTRA = SCRIPT_FILE ? fs.readFileSync(SCRIPT_FILE, 'utf8') : '';

const ALL_PAGES = [
  { url: '/account', out: 'scripts/_acc_overview.png' },
  { url: '/account/signups', out: 'scripts/_acc_signups.png' },
  { url: '/account/applications', out: 'scripts/_acc_applications.png' },
  { url: '/account/messages', out: 'scripts/_acc_messages.png' },
  { url: '/account/join', out: 'scripts/_acc_join.png' },
  { url: '/account/profile', out: 'scripts/_acc_profile.png' },
];
const PAGES = ONLY.length ? ALL_PAGES.filter((p) => ONLY.includes(p.url)) : ALL_PAGES;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('no chrome/edge found');
  process.exit(1);
}

const port = 9800 + Math.floor(Math.random() * 180);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-acc-'));
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
    `--window-size=${WIDTH},${HEIGHT}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);
if (process.env.DEBUG_CHROME) {
  proc.stdout.on('data', (d) => process.stdout.write('CHROME: ' + d.toString().slice(0, 400)));
  proc.stderr.on('data', (d) => process.stdout.write('CHROME_ERR: ' + d.toString().slice(0, 400)));
  proc.on('exit', (c) => console.log('CHROME EXIT', c));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  let last = '';
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`chrome 进程已退出（code ${proc.exitCode}）`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (e) {
      last = e?.message || String(e);
    }
    await sleep(250);
  }
  throw new Error(`chrome devtools 未就绪（port ${port}, last: ${last}）`);
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

const consoleMsgs = [];
const exceptions = [];
const failedRequests = [];

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
    if (m === 'Runtime.consoleAPICalled') {
      const text = (d.params.args || [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? a.type)
        .join(' ');
      consoleMsgs.push({ level: d.params.type, text, url: d.params.stackTrace?.callFrames?.[0]?.url });
    } else if (m === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails;
      exceptions.push({ text: e.exception?.description || e.text, url: e.url });
    } else if (m === 'Log.entryAdded') {
      const e = d.params.entry;
      if (e.level === 'error') consoleMsgs.push({ level: 'error', text: `[${e.source}] ${e.text}`, url: e.url });
    } else if (m === 'Network.loadingFailed') {
      if (['Fetch', 'XHR', 'Script', 'Stylesheet'].includes(d.params.type))
        failedRequests.push(`${d.params.type} ${d.params.errorText}`);
    }
  });

  await rpc(ws, 'Runtime.enable', {}, sessionId);
  await rpc(ws, 'Log.enable', {}, sessionId);
  await rpc(ws, 'Page.enable', {}, sessionId);
  await rpc(ws, 'Network.enable', {}, sessionId);
  await rpc(
    ws,
    'Emulation.setDeviceMetricsOverride',
    { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 700 },
    sessionId
  );

  /* ---------- 1. 登录并注入令牌 ---------- */
  await rpc(ws, 'Page.navigate', { url: `${BASE}/login` }, sessionId);
  await sleep(2500);

  const login = await rpc(
    ws,
    'Runtime.evaluate',
    {
      expression: `fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(
        USER
      )})}).then(r=>r.json()).then(j=>{if(!j||!j.data||!j.data.token)throw new Error('登录失败: '+JSON.stringify(j));localStorage.setItem('sti_token',j.data.token);return j.data.user.name+'/'+j.data.user.role})`,
      returnByValue: true,
      awaitPromise: true,
    },
    sessionId
  );
  if (login.exceptionDetails) {
    exceptions.push({ text: 'login: ' + (login.exceptionDetails.exception?.description || login.exceptionDetails.text) });
    console.log('!! 登录失败:', login.exceptionDetails.exception?.description || login.exceptionDetails.text);
  } else {
    console.log(`LOGIN   : ${login.result.value}  (token 已写入 localStorage.sti_token)`);
  }

  /* ---------- 2. 逐页检查 ---------- */
  for (const p of PAGES) {
    const markEx = exceptions.length;
    const markErr = consoleMsgs.filter((m) => m.level === 'error').length;

    await rpc(ws, 'Page.navigate', { url: `${BASE}${p.url}` }, sessionId);
    await sleep(3200);

    if (EXTRA) {
      const r = await rpc(ws, 'Runtime.evaluate', { expression: EXTRA, returnByValue: true, awaitPromise: true }, sessionId);
      if (r.exceptionDetails) {
        console.log(`\n=== ${p.url} ===`);
        console.log('EXTRA   : !! 注入脚本异常 ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      } else {
        console.log(`\nEXTRA@${p.url}: ${typeof r.result.value === 'string' ? r.result.value : JSON.stringify(r.result.value)}`);
      }
      await sleep(1200);
    }

    /* 触发滚动揭示动画 */
    await rpc(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 400)' }, sessionId);
    await sleep(700);
    await rpc(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId);
    await sleep(500);

    const info = await rpc(
      ws,
      'Runtime.evaluate',
      {
        expression: `JSON.stringify({
          title: document.title,
          rootChildren: document.getElementById('root')?.children.length ?? -1,
          h1: (document.querySelector('h1')?.innerText || '').replace(/\\s+/g,' ').trim(),
          navItems: document.querySelectorAll('nav a').length,
          cards: document.querySelectorAll('.lg, .lg-soft, .lg-thin, .lg-strong').length,
          buttons: document.querySelectorAll('button').length,
          text: (document.body.innerText || '').replace(/\\s+/g,' ').slice(0, 420),
          height: document.body.scrollHeight
        })`,
        returnByValue: true,
      },
      sessionId
    );

    if (p.out) {
      const shot = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true }, sessionId);
      const file = p.out.replace('.png', `${TAG}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`SHOT    : ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
    }

    const meta = JSON.parse(info.result.value);
    const newEx = exceptions.slice(markEx);
    const newErr = consoleMsgs.filter((m) => m.level === 'error').slice(markErr);
    console.log(`\n=== ${p.url} ===`);
    console.log(`TITLE   : ${meta.title}`);
    console.log(`ROOT    : ${meta.rootChildren} children, ${meta.height}px 高`);
    console.log(`H1      : ${meta.h1}`);
    console.log(`GLASS   : ${meta.cards} 片 · BUTTON ${meta.buttons} 个 · NAV-LINK ${meta.navItems} 个`);
    console.log(`TEXT    : ${JSON.stringify(meta.text)}`);
    console.log(
      newEx.length || newErr.length
        ? `RESULT  : !! ${newEx.length} 异常 / ${newErr.length} 控制台错误`
        : 'RESULT  : OK : 无 JS 异常 / 控制台错误'
    );
    newEx.slice(0, 4).forEach((e) => console.log('   EX: ' + String(e.text).split('\n').slice(0, 3).join(' | ')));
    newErr.slice(0, 4).forEach((e) => console.log('   ERR: ' + String(e.text).slice(0, 300)));
  }

  /* 收尾：按需把最近 N 条消息恢复为未读（供截图保留未读徽章） */
  const restore = Number(process.env.RESTORE_UNREAD || 0);
  if (restore > 0) {
    const db = new DatabaseSync('data/portal.db');
    const rows = db.prepare('SELECT id FROM user_messages WHERE userId=(SELECT id FROM users WHERE username=?) ORDER BY id DESC LIMIT ?').all(USER.username, restore);
    const upd = db.prepare('UPDATE user_messages SET read=0 WHERE id=?');
    rows.forEach((r) => upd.run(r.id));
    db.close();
    console.log(`\nRESTORE : 已将 ${rows.length} 条消息恢复为未读（${rows.map((r) => r.id).join(', ')}）`);
  }
} catch (e) {
  console.error('DRIVER ERROR:', e.message);
  process.exitCode = 2;
} finally {
  proc.kill();
  await sleep(250);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
