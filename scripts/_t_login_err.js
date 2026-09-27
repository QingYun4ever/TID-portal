/* 交互测试：/login 密码错误 → 表单顶部红色提示条（真实 401） */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setVal(document.querySelector('input[autocomplete=username]'), 'admin');
  setVal(document.querySelector('input[autocomplete=current-password]'), 'wrong-password-123');
  document.querySelector('form button[type=submit]').click();
  await sleep(1800);

  const alert = document.querySelector('[role=alert]');
  if (!alert) throw new Error('未展示错误提示条');
  const txt = alert.textContent || '';
  if (txt.indexOf('账号或密码错误') < 0) throw new Error('错误文案不符: ' + txt);
  alert.scrollIntoView({ block: 'center' });
  return 'ok';
})()
