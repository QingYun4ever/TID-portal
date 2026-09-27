/* =============================================================================
 * 浏览器驱动（Chrome DevTools Protocol）
 *  - 打开页面，收集 console / 未捕获异常 / 失败请求
 *  - 支持视口截图与整页截图
 *  - 支持注入脚本（用于点击、滚动等交互后截图）
 *
 * 用法:
 *   node scripts/browser.mjs --url http://localhost:5273/ --out shot.png
 *   node scripts/browser.mjs --url ... --out shot.png --full --wait 5000
 *   node scripts/browser.mjs --url ... --out shot.png --eval "window.scrollTo(0,2000)" --wait 1500
 *   node scripts/browser.mjs --url ... --out shot.png --width 430 --height 900   # 移动端
 * ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function parseArgs(argv) {
  const a = { url: '', out: '', width: 1600, height: 1000, wait: 3500, full: false, eval: '', scale: 1, quiet: false, scrolls: 0, seed: '', token: '' };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--url') a.url = v;
    else if (k === '--out') a.out = v;
    else if (k === '--seed') a.seed = v;
    else if (k === '--token') a.token = v;
    else if (k === '--width') a.width = Number(v);
    else if (k === '--height') a.height = Number(v);
    else if (k === '--wait') a.wait = Number(v);
    else if (k === '--scale') a.scale = Number(v);
    else if (k === '--eval') a.eval = v;
    else if (k === '--scrolls') a.scrolls = Number(v);
    else if (k === '--full') a.full = true;
    else if (k === '--quiet') a.quiet = true;
    else continue;
    i++;
  }
  return a;
}

const args = parseArgs(process.argv);
if (!args.url) {
  console.error('need --url');
  process.exit(1);
}

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('no chrome/edge found');
  process.exit(1);
}

const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const consoleMsgs = [];
const exceptions = [];
const failedRequests = [];

try {
  const browserWs = await getWsUrl();
  const ws = new WebSocket(browserWs);
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
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? (a.preview ? JSON.stringify(a.preview) : a.type))
        .join(' ');
      consoleMsgs.push({ level: d.params.type, text });
    } else if (m === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails;
      exceptions.push({
        text: e.exception?.description || e.text,
        url: e.url,
        line: e.lineNumber,
        col: e.columnNumber,
      });
    } else if (m === 'Log.entryAdded') {
      const e = d.params.entry;
      if (e.level === 'error') consoleMsgs.push({ level: 'error', text: `[${e.source}] ${e.text}` });
    } else if (m === 'Network.loadingFailed') {
      if (d.params.type === 'Fetch' || d.params.type === 'XHR' || d.params.type === 'Script' || d.params.type === 'Stylesheet') {
        failedRequests.push(`${d.params.type} ${d.params.errorText}`);
      }
    }
  });

  await rpc(ws, 'Runtime.enable', {}, sessionId);
  await rpc(ws, 'Log.enable', {}, sessionId);
  await rpc(ws, 'Page.enable', {}, sessionId);
  await rpc(ws, 'Network.enable', {}, sessionId);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', {
    width: args.width,
    height: args.height,
    deviceScaleFactor: args.scale,
    mobile: args.width < 700,
  }, sessionId);

  // 预置 localStorage（每个新文档创建前执行），用于后台页面的令牌注入
  // 注入登录令牌（localStorage），便于验证需要鉴权的页面
  const seedSource = args.token
    ? `localStorage.setItem('sti_token', ${JSON.stringify(args.token)});${args.seed || ''}`
    : args.seed;

  if (seedSource) {
    await rpc(
      ws,
      'Page.addScriptToEvaluateOnNewDocument',
      { source: `try{if(location.protocol==='http:'||location.protocol==='https:'){${seedSource}}}catch(e){console.error('seed failed',e)}` },
      sessionId
    );
  }

  await rpc(ws, 'Page.navigate', { url: args.url }, sessionId);
  await sleep(args.wait);

  // 依次滚动，触发滚动揭示动画
  if (args.scrolls > 0) {
    const total = await rpc(ws, 'Runtime.evaluate', { expression: 'document.body.scrollHeight', returnByValue: true }, sessionId);
    const h = total.result?.value ?? 0;
    for (let i = 1; i <= args.scrolls; i++) {
      await rpc(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, ${Math.round((h * i) / (args.scrolls + 1))})`, returnByValue: true }, sessionId);
      await sleep(700);
    }
    await rpc(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0,0)', returnByValue: true }, sessionId);
    await sleep(600);
  }

  if (args.eval) {
    const r = await rpc(ws, 'Runtime.evaluate', { expression: args.eval, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) exceptions.push({ text: 'eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) });
    else if (!args.quiet) {
      try {
        console.log(`EVAL    : ${JSON.stringify(r.result?.value)}`);
      } catch {
        /* ignore */
      }
    }
  }

  if (args.out) {
    const shot = await rpc(
      ws,
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: args.full, fromSurface: true },
      sessionId
    );
    fs.writeFileSync(args.out, Buffer.from(shot.data, 'base64'));
  }

  // 额外信息
  const info = await rpc(
    ws,
    'Runtime.evaluate',
    {
      expression: `JSON.stringify({ title: document.title, rootChildren: document.getElementById('root')?.children.length ?? -1, bodyText: (document.body.innerText||'').slice(0,200), scrollH: document.body.scrollHeight })`,
      returnByValue: true,
    },
    sessionId
  );

  if (!args.quiet) {
    const meta = (() => {
      try {
        return JSON.parse(info.result.value);
      } catch {
        return null;
      }
    })();
    if (meta) {
      console.log(`TITLE   : ${meta.title}`);
      console.log(`ROOT    : ${meta.rootChildren} children, page height ${meta.scrollH}px`);
      console.log(`TEXT    : ${JSON.stringify(meta.bodyText.replace(/\s+/g, ' ').slice(0, 160))}`);
    }
    if (args.out) console.log(`SHOT    : ${args.out} (${(fs.statSync(args.out).size / 1024).toFixed(1)} KB)`);

    const errs = consoleMsgs.filter((m) => m.level === 'error');
    if (exceptions.length) {
      console.log(`\n!! EXCEPTIONS (${exceptions.length})`);
      exceptions.slice(0, 8).forEach((e) => console.log('   ' + String(e.text).split('\n').slice(0, 4).join('\n   ')));
    }
    if (errs.length) {
      console.log(`\n!! CONSOLE ERRORS (${errs.length})`);
      errs.slice(0, 12).forEach((e) => console.log('   ' + e.text.slice(0, 400)));
    }
    if (failedRequests.length) {
      console.log(`\n!! FAILED REQUESTS (${failedRequests.length})`);
      [...new Set(failedRequests)].slice(0, 10).forEach((e) => console.log('   ' + e));
    }
    const warns = consoleMsgs.filter((m) => m.level === 'warning');
    if (warns.length) {
      console.log(`\n-- warnings (${warns.length})`);
      warns.slice(0, 6).forEach((w) => console.log('   ' + w.text.slice(0, 240)));
    }
    if (!exceptions.length && !errs.length) console.log('\nOK      : 无 JS 异常 / 控制台错误');
  }
} catch (e) {
  console.error('DRIVER ERROR:', e.message);
  process.exitCode = 2;
} finally {
  try {
    const errs = consoleMsgs.filter((m) => m.level === 'error');
    if (exceptions.length) console.log(`!! EXCEPTIONS (${exceptions.length})`);
    if (errs.length) console.log(`!! CONSOLE ERRORS (${errs.length})`);
    exceptions.slice(0, 6).forEach((e) => console.log('   EXC ' + String(e.text).split('\n').slice(0, 3).join(' | ')));
    errs.slice(0, 8).forEach((e) => console.log('   ERR ' + e.text.slice(0, 300)));
    if (failedRequests.length) console.log(`!! FAILED REQUESTS: ${[...new Set(failedRequests)].join(' ; ')}`);
    console.log(`DIAG    : ${exceptions.length} exceptions / ${errs.length} console errors during run`);
  } catch {
    /* ignore */
  }
  proc.kill();
  await sleep(250);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
