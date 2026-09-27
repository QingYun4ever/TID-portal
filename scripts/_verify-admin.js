/*
 * Admin page verification driver (used through scripts/browser.mjs --eval).
 *
 * Usage:
 *   node scripts/browser.mjs --url "http://127.0.0.1:5273/login?redirect=/admin/articles&drawer=1" `
 *     --out "scripts/_a1.png" --wait 5000 --eval (Get-Content -Raw scripts/_verify-admin.js)
 *
 * Flow: open /login -> fill the admin credentials through the native value setter ->
 *       click submit -> wait for the redirect to the target admin page ->
 *       (drawer=1) click the primary "create" button to open the drawer ->
 *       write the verification facts into document.title (browser.mjs prints it as TITLE).
 *
 * NOTE: this file is evaluated as a single JS expression, so it is one async IIFE.
 * NOTE: keep this file pure ASCII - PowerShell argument passing mangles UTF-8 here.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = new URLSearchParams(location.search);
  const wantDrawer = q.get('drawer') === '1';
  const buttons = () => Array.from(document.querySelectorAll('button'));

  const fail = (why) => {
    document.title = 'VERIFY FAIL | ' + why + ' | path=' + location.pathname;
    return 'fail';
  };

  const setValue = (el, v) => {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    desc.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const user = document.querySelector('input[autocomplete="username"]');
  const pwd = document.querySelector('input[autocomplete="current-password"]');
  if (!user || !pwd) return fail('login inputs not found');
  setValue(user, 'admin');
  setValue(pwd, 'admin123');
  await sleep(300);

  const form = pwd.closest('form');
  const submit = form ? form.querySelector('button[type="submit"]') : null;
  if (!submit) return fail('submit button not found');
  submit.click();
  await sleep(4500);

  if (location.pathname.indexOf('/admin/') !== 0 || location.pathname === '/admin') {
    const alert = document.querySelector('[role="alert"]');
    const alertText = alert ? (alert.textContent || '').replace(/\s+/g, ' ').slice(0, 60) : 'no-alert';
    const toasts = Array.from(document.querySelectorAll('[class*="toast"], [data-toast]'))
      .map((t) => (t.textContent || '').replace(/\s+/g, ' '))
      .join(' / ')
      .slice(0, 80);
    return fail('not on target admin route after login | alert=' + alertText + ' | toasts=' + (toasts || 'none'));
  }

  let drawer = 'none';
  if (wantDrawer) {
    const primary = Array.from(document.querySelectorAll('button.btn-primary'));
    const create = primary[primary.length - 1];
    if (!create) drawer = 'no-create-button';
    else {
      create.click();
      await sleep(1800);
    }
  }

  const titleBox = Array.from(document.querySelectorAll('div')).find(
    (d) => typeof d.className === 'string' && d.className.indexOf('text-base font-semibold') >= 0
  );
  const drawerTitle = titleBox ? (titleBox.textContent || '').trim() : '';
  if (drawerTitle) drawer = 'len' + drawerTitle.length + ':' + drawerTitle;

  const text = document.body.innerText || '';
  const body = text.replace(/\s+/g, ' ');
  document.title =
    'VERIFY ' +
    location.pathname +
    ' | rows=' + document.querySelectorAll('tbody tr').length +
    ' | tiles=' + document.querySelectorAll('div.mono.text-xl').length +
    ' | bars=' + document.querySelectorAll('div.h-1\\.5').length +
    ' | drawer=' + drawer +
    ' | drawerFields=' + document.querySelectorAll('div.fixed.inset-0 button[aria-label]').length +
    ' | inputs=' + document.querySelectorAll('input').length +
    ' | textareas=' + document.querySelectorAll('textarea').length +
    ' | richtext=' + document.querySelectorAll('.prose-glass').length +
    ' | chips=' + document.querySelectorAll('.chip').length +
    ' | emptyState=' + (body.indexOf('暂无') >= 0 ? 'yes' : 'no');
  return 'done';
})()
