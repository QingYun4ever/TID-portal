/* 交互测试：/join 点击「申请该岗位」→ 预选 + 滚到表单；提交 → 模拟后端 409 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const origin = window.fetch;
  window.fetch = async (u, o) => {
    if (String(u).indexOf('/join/apply') >= 0) {
      return new Response(JSON.stringify({ ok: false, error: '你已提交过报名申请，请耐心等待结果' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return origin(u, o);
  };

  const setVal = (el, v) => {
    const proto =
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // 1) 点击第一个岗位卡片的「申请该岗位」
  const applyBtn = [...document.querySelectorAll('#positions button')].find((b) => (b.textContent || '').indexOf('申请该岗位') >= 0);
  if (!applyBtn) throw new Error('未找到「申请该岗位」按钮');
  applyBtn.click();
  await sleep(900);

  const form = document.querySelector('#apply form');
  if (!form) throw new Error('未找到报名表单');
  const posSel = form.querySelector('select');
  if (!posSel.value) throw new Error('点击「申请该岗位」后未预选岗位');
  const selectedCard = [...document.querySelectorAll('#positions button')].find((b) => (b.textContent || '').indexOf('已选择该岗位') >= 0);
  if (!selectedCard) throw new Error('岗位卡片未显示「已选择该岗位」');

  // 2) 填写其余必填项
  const q = (sel) => form.querySelector(sel);
  setVal(q('input[placeholder="请输入真实姓名"]'), '测试同学');
  setVal(q('input[placeholder="如 2024100123"]'), '2024100199');
  setVal(q('input[placeholder="如 计算机科学与技术学院"]'), '计算机科学与技术学院');
  setVal(q('input[placeholder="如 软件工程"]'), '软件工程');
  const gradeSel = [...form.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === '大一'));
  setVal(gradeSel, '大一');
  setVal(q('input[placeholder="11 位手机号"]'), '13800001111');
  setVal(q('textarea'), '我长期使用 React 与 TypeScript 做个人项目，希望加入技术服务组参与门户迭代。');

  // 3) 提交（后端 409）
  q('button[type=submit]').click();
  await sleep(1200);

  const alert = document.querySelector('#apply [role=alert]');
  if (!alert) throw new Error('409 未展示错误提示条');
  const txt = alert.textContent || '';
  if (txt.indexOf('已提交过报名申请') < 0) throw new Error('错误提示文案不符合预期: ' + txt);
  window.scrollTo({ top: alert.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' });
  await sleep(1200);
  return 'ok';
})()
