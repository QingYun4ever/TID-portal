/* 交互测试：/join 空表单提交 → 前端校验错误 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const instant = (el, offset) => {
    const y = el.getBoundingClientRect().top + window.scrollY - (offset || 90);
    window.scrollTo({ top: y, behavior: 'instant' });
  };
  const btn = document.querySelector('#apply form button[type=submit]');
  if (!btn) throw new Error('未找到提交按钮');
  btn.click();
  await sleep(700);
  const errs = [...document.querySelectorAll('#apply form p')].map((p) => p.textContent || '').filter((t) => /^请|至少|格式|当前/.test(t.trim()));
  if (errs.length < 5) throw new Error('校验提示数量不足: ' + errs.length + ' :: ' + JSON.stringify(errs));
  instant(document.querySelector('#apply form').closest('.lg-strong') || document.querySelector('#apply'), 88);
  await sleep(1400);
  return 'ok';
})()
