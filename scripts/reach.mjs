/* =============================================================================
 * 逐块可达性检查
 *
 * 反复模拟滚轮，记录页面停靠过的位置，然后校验：
 *   main 下每一个「参与文档流、且高度 ≥ 120px」的块，
 *   其顶部是否都能被停靠到（向下、向上两个方向分别检查）。
 *
 * 这正是「卡片卡在两屏之间翻不到」这类 bug 的自动化检测。
 *
 * 用法:
 *   node scripts/reach.mjs --base http://127.0.0.1:8787 / /news /gallery
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
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const BASE = opt('--base', 'http://127.0.0.1:8787');
const TOKEN = opt('--token', '');
const HEIGHT = Number(opt('--height', 719));   // 默认用用户的窗口高度，更贴近真实
const PATHS = argv.filter((a) => a.startsWith('/'));
const TARGETS = PATHS.length ? PATHS : ['/'];

if (!CHROME) { console.error('未找到 Chrome / Edge'); process.exit(1); }

const port = 9700 + Math.floor(Math.random() * 250);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rch-'));
const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=1440,${HEIGHT}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const rpc = (ws, method, params = {}, sid) => new Promise((resolve, reject) => {
  const mid = ++id;
  const onMsg = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (d.id !== mid) return;
    ws.removeEventListener('message', onMsg);
    d.error ? reject(new Error(d.error.message)) : resolve(d.result);
  };
  ws.addEventListener('message', onMsg);
  ws.send(JSON.stringify(sid ? { id: mid, method, params, sessionId: sid } : { id: mid, method, params }));
  setTimeout(() => { ws.removeEventListener('message', onMsg); reject(new Error(method + ' timeout')); }, 20000);
});

const evalIn = async (ws, sid, expression) => {
  const r = await rpc(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};

// 与页面里的 snap 采集逻辑保持一致：优先最外层语义区块，否则回退 main 直接子块
const COLLECT_BLOCKS = `(function(){
  var main = document.querySelector('main');
  if (!main) return '[]';
  function usable(el){
    var p = getComputedStyle(el).position;
    return p !== 'fixed' && p !== 'sticky' && el.offsetHeight >= 120;
  }
  var SEM = 'section, header, article, [data-snap]';
  var semantic = Array.prototype.slice.call(main.querySelectorAll(SEM)).filter(function(el){
    if (el.parentElement && el.parentElement.closest(SEM)) return false;
    return usable(el);
  });
  var list = semantic.length >= 2 ? semantic
           : Array.prototype.slice.call(main.children).filter(usable);
  return JSON.stringify(list.map(function (el) {
    return { top: Math.round(el.getBoundingClientRect().top + window.scrollY), h: Math.round(el.offsetHeight) };
  }).sort(function (a, b) { return a.top - b.top; }));
})()`;

const WHEEL = (dir) =>
  `window.dispatchEvent(new WheelEvent('wheel',{deltaY:${dir * 120},bubbles:true,cancelable:true}));window.scrollY`;

let totalFail = 0;

try {
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(150); }
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId: sid } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await rpc(ws, 'Runtime.enable', {}, sid);
  await rpc(ws, 'Page.enable', {}, sid);
  if (TOKEN) {
    await rpc(ws, 'Page.addScriptToEvaluateOnNewDocument',
      { source: `try{localStorage.setItem('sti_token', ${JSON.stringify(TOKEN)})}catch(e){}` }, sid);
  }

  for (const p of TARGETS) {
    await rpc(ws, 'Page.navigate', { url: BASE + p }, sid);
    await sleep(1600);
    // 关掉平滑滚动，让位置立刻稳定，便于测量
    await evalIn(ws, sid, `document.documentElement.style.scrollBehavior='auto';'ok'`);

    const blocks = JSON.parse(await evalIn(ws, sid, COLLECT_BLOCKS) || '[]');

    // ---- 向下 ----
    await evalIn(ws, sid, `window.scrollTo(0,0);'ok'`);
    await sleep(250);
    const down = new Set([0]);
    for (let i = 0; i < 40; i++) {
      const y = await evalIn(ws, sid, WHEEL(1));
      await sleep(870);
      const y2 = await evalIn(ws, sid, `window.scrollY`);
      down.add(Math.round(y2));
      if (y2 === y) break;
    }

    // ---- 向上 ----
    await evalIn(ws, sid, `window.scrollTo(0,document.documentElement.scrollHeight);'ok'`);
    await sleep(250);
    const up = new Set([Math.round(await evalIn(ws, sid, `window.scrollY`))]);
    for (let i = 0; i < 40; i++) {
      const y = await evalIn(ws, sid, WHEEL(-1));
      await sleep(870);
      const y2 = await evalIn(ws, sid, `window.scrollY`);
      up.add(Math.round(y2));
      if (y2 === y) break;
    }

    const isVisited = (set, top) => [...set].some((v) => Math.abs(v - top) <= 8);
    const bad = blocks.filter((b) => !isVisited(down, b.top) && !isVisited(up, b.top));
    const onlyUp = blocks.filter((b) => !isVisited(down, b.top) && isVisited(up, b.top));

    console.log(`\n=== ${p}  (${blocks.length} 个块, 视口 ${HEIGHT}px) ===`);
    for (const b of blocks) {
      const d = isVisited(down, b.top) ? '↓' : ' ';
      const u = isVisited(up, b.top) ? '↑' : ' ';
      const flag = isVisited(down, b.top) ? 'OK  ' : isVisited(up, b.top) ? 'UP  ' : 'BAD ';
      console.log(`  [${flag}] top=${String(b.top).padStart(6)}  h=${String(b.h).padStart(5)}  ${d}${u}`);
    }
    if (bad.length || onlyUp.length) {
      totalFail += bad.length + onlyUp.length;
      console.log(`  ✗ 不可达 (上下都到不了): ${bad.length} 个;  仅向上可达: ${onlyUp.length} 个`);
    } else {
      console.log('  ✓ 所有块向下、向上都能停靠到');
    }
  }

  console.log('');
  console.log(totalFail === 0 ? '✓ 可达性检查全部通过' : `✗ 共 ${totalFail} 处不可达`);
  process.exitCode = totalFail ? 1 : 0;
} catch (e) {
  console.error('REACH ERROR:', e.message);
  process.exitCode = 2;
} finally {
  proc.kill();
  await sleep(200);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
