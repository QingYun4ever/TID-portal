/* 交互测试：/login?redirect=%2Ffeedback —— 一键填充测试账号 + 真实登录 + 重定向 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, v) => {
    const proto = HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fillBtn = [...document.querySelectorAll('button')].find((b) => {
    if ((b.textContent || '').indexOf('一键填充') < 0) return false;
    const card = b.closest('.lg-thin');
    return !!card && (card.textContent || '').indexOf('admin123') >= 0;
  });
  if (!fillBtn) throw new Error('未找到 admin 的「一键填充」按钮');
  fillBtn.click();
  await sleep(500);

  const userInput = document.querySelector('input[autocomplete=username]');
  if (userInput.value !== 'admin') throw new Error('一键填充未写入账号: ' + userInput.value);

  document.querySelector('form button[type=submit]').click();
  await sleep(2600);

  if (location.pathname !== '/feedback') throw new Error('redirect 未生效，当前路径: ' + location.pathname);
  const toastHost = [...document.querySelectorAll('body *')].some((n) => (n.textContent || '') === '可进入后台管理');
  if (!toastHost) throw new Error('管理员未收到「可进入后台管理」提示');
  document.title = 'PATH=' + location.pathname + ' · ' + document.title;
  return 'ok';
})()
