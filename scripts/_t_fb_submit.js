/* 交互测试：/feedback 实名切换 + 提交成功（mock POST /api/feedback） */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const origin = window.fetch;
  window.fetch = async (u, o) => {
    if (String(u).indexOf('/api/feedback') >= 0 && o && o.method === 'POST' && String(u).indexOf('/like') < 0) {
      return new Response(JSON.stringify({ ok: true, data: { id: 4242 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return origin(u, o);
  };

  const setVal = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const form = document.querySelector('#compose form');
  if (!form) throw new Error('未找到留言表单');
  setVal(form.querySelector('input[placeholder="如：大创项目可以跨学院组队吗？"]'), '门户能否支持竞赛日历订阅？');
  setVal(form.querySelector('textarea'), '希望把竞赛截止时间导出成 iCal 订阅到手机日历，避免错过报名截止。');

  // 切换到实名 → 应出现「姓名 / 联系方式」
  const sw = form.querySelector('[role=switch]');
  if (!sw) throw new Error('未找到匿名开关');
  sw.click();
  await sleep(400);
  const nameInput = form.querySelector('input[placeholder="将展示在留言上"]');
  if (!nameInput) throw new Error('关闭匿名后未显示姓名输入框');
  setVal(nameInput, '测试同学');
  setVal(form.querySelector('input[placeholder="name@university.edu.cn"]'), 'me@university.edu.cn');

  form.querySelector('button[type=submit]').click();
  await sleep(1200);

  const title = form.querySelector('input[placeholder="如：大创项目可以跨学院组队吗？"]');
  if (title.value !== '') throw new Error('提交成功后表单未重置: ' + title.value);
  const toast = [...document.querySelectorAll('body *')].find((n) => (n.textContent || '') === '留言已提交');
  if (!toast) throw new Error('未出现「留言已提交」提示');
  return 'ok';
})()
