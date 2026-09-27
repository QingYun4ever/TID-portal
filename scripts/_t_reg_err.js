/* 交互测试：/register 两次密码不一致 → 校验；账号已存在 → 真实 409 友好提示 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const form = document.querySelector('form');
  const q = (sel) => form.querySelector(sel);
  const user = q('input[autocomplete=username]');
  const name = q('input[autocomplete=name]');
  const pwd = q('input[autocomplete=new-password]');
  const conf = [...form.querySelectorAll('input[autocomplete=new-password]')][1];
  const sid = q('input[inputmode=numeric]');

  // 1) 密码不一致
  setVal(user, 'testagent04');
  setVal(name, '测试同学');
  setVal(pwd, 'abc123456');
  setVal(conf, 'abc12345');
  setVal(sid, '2024100199');
  form.querySelector('button[type=submit]').click();
  await sleep(700);
  const mismatch = [...form.querySelectorAll('p')].some((p) => (p.textContent || '').indexOf('两次输入的密码不一致') >= 0);
  if (!mismatch) throw new Error('未提示两次密码不一致');

  // 2) 账号已存在（真实 409，不新增数据）
  setVal(conf, 'abc123456');
  setVal(user, 'admin');
  await sleep(200);
  form.querySelector('button[type=submit]').click();
  await sleep(1600);
  const alert = document.querySelector('[role=alert]');
  if (!alert) throw new Error('未展示 409 提示条');
  if ((alert.textContent || '').indexOf('已被注册') < 0) throw new Error('409 文案不符: ' + alert.textContent);
  alert.scrollIntoView({ block: 'center' });
  return 'ok';
})()
