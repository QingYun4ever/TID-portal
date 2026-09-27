/*
 * Extra verification: client-side filter bridge (category / level / year).
 *
 * The generic CRUD endpoint ignores unknown query params, so the admin pages rely on
 * src/pages/admin/adminResourceAdapter.ts to post-filter on the client. This script proves
 * the filter really narrows the table, by comparing the rendered row count against ground
 * truth fetched straight from the API.
 *
 * Usage:
 *   node scripts/browser.mjs --url "http://127.0.0.1:5273/login?redirect=/admin/projects&filterKey=year&filterIndex=2" `
 *     --out "scripts/_filter.png" --wait 5000 --eval (Get-Content -Raw scripts/_verify-filter.js)
 *
 * Keep this file pure ASCII.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = new URLSearchParams(location.search);
  const filterKey = q.get('filterKey') || '';
  const filterIndex = Number(q.get('filterIndex') || '0');

  const fail = (why) => {
    document.title = 'FILTER FAIL | ' + why + ' | path=' + location.pathname;
    return 'fail';
  };

  const setValue = (el, v, proto) => {
    const desc = Object.getOwnPropertyDescriptor(proto.prototype, 'value');
    desc.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const user = document.querySelector('input[autocomplete="username"]');
  const pwd = document.querySelector('input[autocomplete="current-password"]');
  if (!user || !pwd) return fail('login inputs not found');
  setValue(user, 'admin', HTMLInputElement);
  setValue(pwd, 'admin123', HTMLInputElement);
  await sleep(300);
  const form = pwd.closest('form');
  const submit = form ? form.querySelector('button[type="submit"]') : null;
  if (!submit) return fail('submit button not found');
  submit.click();
  await sleep(4500);
  if (location.pathname.indexOf('/admin/') !== 0 || location.pathname === '/admin') return fail('login failed');

  const resource = location.pathname.split('/').pop();
  const token = localStorage.getItem('sti_token') || '';
  const raw = await fetch('/api/admin/' + resource + '?page=1&pageSize=200', {
    headers: { Authorization: 'Bearer ' + token },
  }).then((r) => r.json());
  const rowsAll = (raw && raw.data && raw.data.items) || [];
  if (!rowsAll.length) return fail('resource returned no rows');

  const selects = Array.from(document.querySelectorAll('select'));
  const sel = selects[filterIndex];
  if (!sel) return fail('filter select #' + filterIndex + ' not found (found ' + selects.length + ')');

  const counts = Array.from(sel.options)
    .slice(1)
    .map((o) => ({ value: o.value, n: rowsAll.filter((r) => String(r[filterKey]) === String(o.value)).length }))
    .filter((c) => c.value !== '');
  if (!counts.length) return fail('filter select has no concrete options');
  const inside = counts.find((c) => c.n > 0 && c.n < rowsAll.length);
  const target = inside || counts[0];
  if (!target.n) return fail('ground truth is empty for every option of ' + filterKey);

  setValue(sel, target.value, HTMLSelectElement);
  await sleep(3200);

  const rendered = document.querySelectorAll('tbody tr').length;
  const m = /共\s*(\d+)\s*条/.exec(document.body.innerText || '');
  const stated = m ? Number(m[1]) : -1;
  const ok = rendered === target.n && stated === target.n;

  document.title =
    'FILTER ' + resource +
    ' | key=' + filterKey +
    ' | pickedLen=' + target.value.length +
    ' | expected=' + target.n +
    ' | rendered=' + rendered +
    ' | statedTotal=' + stated +
    ' | allRows=' + rowsAll.length +
    ' | verdict=' + (ok ? 'PASS' : 'CHECK');
  return 'done';
})()
