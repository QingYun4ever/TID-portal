/* 交互测试：/feedback 空表单提交 → 前端校验错误 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = document.querySelector('#compose form button[type=submit]');
  if (!btn) throw new Error('未找到提交按钮');
  btn.click();
  await sleep(700);
  const errs = [...document.querySelectorAll('#compose form p')].map((p) => p.textContent || '').filter((t) => /^请|至少|当前/.test(t.trim()));
  if (errs.length < 2) throw new Error('校验提示数量不足: ' + errs.length + ' :: ' + JSON.stringify(errs));
  return 'ok';
})()
