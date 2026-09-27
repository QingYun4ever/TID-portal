/* 交互测试：/register 注册成功（mock）→ 自动登录 + 跳转 /account */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const origin = window.fetch;
  window.fetch = async (u, o) => {
    const url = String(u);
    if (url.indexOf('/api/auth/register') >= 0) {
      return new Response(
        JSON.stringify({ ok: true, data: { token: 'mock-token', user: { id: 999, username: 'testagent04', name: '测试同学', role: 'student' } } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.indexOf('/api/auth/me') >= 0) {
      return new Response(
        JSON.stringify({ ok: true, data: { user: { id: 999, username: 'testagent04', name: '测试同学', role: 'student' }, stats: {} } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return origin(u, o);
  };

  const setVal = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const form = document.querySelector('form');
  setVal(form.querySelector('input[autocomplete=username]'), 'testagent04');
  setVal(form.querySelector('input[autocomplete=name]'), '测试同学');
  const pwds = [...form.querySelectorAll('input[autocomplete=new-password]')];
  setVal(pwds[0], 'abc123456');
  setVal(pwds[1], 'abc123456');
  setVal(form.querySelector('input[inputmode=numeric]'), '2024100199');
  setVal(form.querySelector('input[autocomplete=email]'), 'test@university.edu.cn');
  setVal(form.querySelector('input[autocomplete=tel]'), '13800001111');
  await sleep(200);
  form.querySelector('button[type=submit]').click();
  await sleep(2400);

  if (location.pathname !== '/account') throw new Error('注册成功后未跳转 /account，当前: ' + location.pathname);
  const toast = [...document.querySelectorAll('body *')].some((n) => (n.textContent || '') === '注册成功');
  if (!toast) throw new Error('未出现「注册成功」提示');
  document.title = 'PATH=' + location.pathname + ' · ' + document.title;
  return 'ok';
})()
