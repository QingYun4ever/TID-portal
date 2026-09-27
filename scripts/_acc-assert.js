/* 用户中心自检 · 页面内交互断言（由 scripts/account-check.mjs 通过 SCRIPT= 注入）
 * 内容是一段 JS 表达式（IIFE），返回 JSON 字符串。 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const txt = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim();
  const clickText = (sel, t) => {
    const el = $$(sel).find((x) => txt(x).includes(t));
    if (!el) return false;
    el.click();
    return true;
  };
  const clickContains = (t) => {
    const el = $$('button, a, [role=button]').find((x) => txt(x).includes(t) && !x.disabled);
    if (!el) return false;
    el.click();
    return true;
  };
  const dialogs = () => $$('[role=dialog], .lg-strong');
  const dialogText = () => dialogs().map(txt).join(' || ');
  const out = {};
  const path = location.pathname;

  /* ------------------------------ 概览 ------------------------------ */
  if (path === '/account') {
    out.statTiles = $$('.mono').filter((e) => /^\d+$/.test(txt(e))).length;
    out.feedLinks = $$('a[href^="/activities/"], a[href="/account/applications"]').length;
    out.quickCards = $$('a[href="/activities"], a[href="/projects/apply"], a[href="/resources"], a[href="/account/messages"], a[href="/account/profile"]').length;
    out.hasGreeting = /(早上好|下午好|晚上好|夜深了)/.test(document.body.innerText);
    out.hasRecentSection = document.body.innerText.includes('最近动态');
    out.feedRows = $$('li').filter((li) => /(报名|申报)/.test(txt(li)) && li.querySelector('a')).length;
  }

  /* ---------------------------- 我的报名 ---------------------------- */
  if (path === '/account/signups') {
    out.groups = $$('button').filter((b) => /即将开始|已结束/.test(txt(b))).map(txt);
    out.cards = $$('.lg-soft, .lg').length;
    out.viewLinks = $$('a[href^="/activities/"]').length;
    out.cancelBtns = $$('button').filter((b) => txt(b).includes('取消报名')).length;

    /* 取消报名 → 确认弹窗 */
    clickContains('取消报名');
    await sleep(500);
    const dt = dialogText();
    out.cancelDialogOpened = dt.includes('取消活动报名');
    out.cancelDialogHasTitle = dt.includes('大学生创新创业训练计划申报宣讲会') || dt.includes('技术沙龙');
    /* 关闭（点「取消」） */
    const cancelBtn = $$('button').find((b) => txt(b) === '取消');
    if (cancelBtn) cancelBtn.click();
    await sleep(400);
    out.cancelDialogClosed = !dialogText().includes('取消活动报名');
  }

  /* ---------------------------- 我的项目 ---------------------------- */
  if (path === '/account/applications') {
    const table = document.querySelector('table');
    out.hasTable = !!table;
    out.tableRows = table ? table.querySelectorAll('tbody tr').length : 0;
    out.headers = table ? Array.from(table.querySelectorAll('thead th')).map(txt) : [];
    out.statusChips = $$('span.chip').filter((c) => /待审核|审核中|已通过|未通过/.test(txt(c))).length;
    out.leaderBadges = $$('span.chip').filter((c) => txt(c) === '负责人').length;

    /* 打开详情抽屉 */
    const detailBtn = $$('button').find((b) => txt(b) === '详情');
    out.detailBtnFound = !!detailBtn;
    if (detailBtn) detailBtn.click();
    await sleep(1200);
    out.modalCount = $$('.lg-strong').length;
    const dt = dialogText() + ' ' + document.body.innerText;
    out.drawerOpened = document.body.innerText.includes('申报详情') && document.body.innerText.includes('团队成员');
    out.drawerHasMembers = dt.includes('刘思远') && dt.includes('孙佳怡') && dt.includes('赵子墨');
    out.drawerHasMaterials = dt.includes('项目申报书.pdf') && dt.includes('技术方案附件.docx');
    out.drawerHasInfo = dt.includes('2023010101') && dt.includes('王建国 教授');
    const close = $$('button[aria-label="关闭"], button[aria-label="关闭抽屉"]')[0];
    if (close) close.click();
    await sleep(500);
    out.drawerClosed = !document.body.innerText.includes('申报详情');
  }

  /* ---------------------------- 我的消息 ---------------------------- */
  if (path === '/account/messages') {
    out.itemCount = $$('li').filter((li) => /未读|已读/.test(txt(li))).length;
    out.unreadBadges = $$('span.chip').filter((c) => txt(c).includes('未读') && !txt(c).includes('已读')).length;
    out.unreadStripes = $$('.bg-primary').length;

    const before = (await (await fetch('/api/auth/messages', { headers: { Authorization: 'Bearer ' + localStorage.getItem('sti_token') } })).json()).unread;
    out.unreadBefore = before;

    /* 未读筛选 */
    const unreadTab = $$('button').find((b) => txt(b).startsWith('未读'));
    if (unreadTab) unreadTab.click();
    await sleep(400);
    out.unreadFilteredCount = $$('li').filter((li) => /未读|已读/.test(txt(li))).length;
    /* 回到全部 */
    const allTab = $$('button').find((b) => txt(b).startsWith('全部'));
    if (allTab) allTab.click();
    await sleep(400);

    /* 单条已读（点击「标为已读」按钮，而非整条卡片） */
    const readBtn = $$('button').find((b) => txt(b).includes('标为已读'));
    out.readBtnFound = !!readBtn;
    let singleReadWorked = false;
    if (readBtn) {
      readBtn.click();
      await sleep(1000);
      const mid = await (await fetch('/api/auth/messages', { headers: { Authorization: 'Bearer ' + localStorage.getItem('sti_token') } })).json();
      out.unreadAfterSingleRead = mid.unread;
      singleReadWorked = mid.unread === before - 1;
    }
    out.singleReadWorked = singleReadWorked;

    /* 点击整条消息：应标记已读并保持原位（无 link） */
    if (singleReadWorked) {
      const item = $$('li').find((li) => txt(li).includes('未读'));
      if (item) {
        const card = item.querySelector('[role="button"]');
        if (card) card.click();
        await sleep(1000);
        const mid2 = await (await fetch('/api/auth/messages', { headers: { Authorization: 'Bearer ' + localStorage.getItem('sti_token') } })).json();
        out.unreadAfterCardClick = mid2.unread;
        out.cardClickMarksRead = mid2.unread === before - 2;
        out.stayedOnMessages = location.pathname === '/account/messages';
      }
    }

    /* 删除确认弹窗 */
    const del = $$('button[aria-label="删除消息"]')[0];
    out.deleteBtnFound = !!del;
    if (del) del.click();
    await sleep(600);
    out.deleteDialogOpened = document.body.innerText.includes('删除消息') && document.body.innerText.includes('确认删除');
    const cancelBtn = $$('button').find((b) => txt(b) === '取消');
    if (cancelBtn) cancelBtn.click();
    await sleep(400);
    out.deleteDialogCancelled = !document.body.innerText.includes('确认删除');

    /* 全部标为已读 */
    clickContains('全部标为已读');
    await sleep(1400);
    const after = await (await fetch('/api/auth/messages', { headers: { Authorization: 'Bearer ' + localStorage.getItem('sti_token') } })).json();
    out.unreadAfterMarkAll = after.unread;
    out.markAllWorked = after.unread === 0;
    out.toastShown = document.body.innerText.includes('已全部标为已读');
  }

  /* ---------------------------- 招新进度 ---------------------------- */
  if (path === '/account/join') {
    out.steps = $$('ol li').map(txt);
    out.stepCount = $$('ol li').length;
    out.statusChips = $$('span.chip').filter((c) => /待筛选|审核中|已录用|未通过/.test(txt(c))).map(txt);
    out.positionChip = $$('span.chip').filter((c) => txt(c).includes('前端开发工程师')).length;
    out.hasProgressNote = document.body.innerText.includes('进行中');
  }

  /* ---------------------------- 个人资料 ------------------------------ */
  if (path === '/account/profile') {
    const inputs = $$('input');
    out.inputCount = inputs.length;
    out.passwordInputs = inputs.filter((i) => i.type === 'password').length;
    out.avatarPreview = !!document.querySelector('img[alt], .rounded-full');
    out.hasCompleteness = document.body.innerText.includes('资料完整度');

    /* 校验：清空姓名后提交 */
    const nameInput = inputs[0];
    if (nameInput) {
      const setVal = (el, v) => {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setVal(nameInput, '');
      const saveBtn = $$('button').find((b) => /保存资料|已是最新/.test(txt(b)));
      out.saveBtnFound = !!saveBtn;
      if (saveBtn) saveBtn.click();
      await sleep(700);
      out.emptyNameError = document.body.innerText.includes('请填写姓名');

      /* 非法邮箱 + 非法手机 */
      const email = inputs.find((i) => i.type === 'email');
      const tel = inputs.find((i) => i.type === 'tel');
      if (email) setVal(email, 'bad-email');
      if (tel) setVal(tel, '123');
      if (saveBtn) saveBtn.click();
      await sleep(700);
      out.emailError = document.body.innerText.includes('邮箱格式不正确');
      out.phoneError = document.body.innerText.includes('请填写 11 位大陆手机号');

      /* 恢复并真实保存 */
      setVal(nameInput, '陈曦');
      if (email) setVal(email, 'chenxi@stu.edu.cn');
      if (tel) setVal(tel, '13800000004');
      const college = inputs[2];
      if (college) setVal(college, '计算机科学与技术学院');
      await sleep(300);
      const save2 = $$('button').find((b) => /保存资料|已是最新/.test(txt(b)));
      if (save2) save2.click();
      await sleep(1600);
      out.saveToast = document.body.innerText.includes('资料已保存');
      const me = await (await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + localStorage.getItem('sti_token') } })).json();
      out.serverName = me?.data?.user?.name;
      out.serverEmail = me?.data?.user?.email;
    }

    /* 密码不一致校验 */
    const pw = $$('input').filter((i) => i.type === 'password');
    const setVal = (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    if (pw.length === 3) {
      setVal(pw[0], 'wrong-old');
      setVal(pw[1], 'abc123');
      setVal(pw[2], 'abc124');
      const btn = $$('button').find((b) => txt(b).includes('更新密码'));
      if (btn) btn.click();
      await sleep(700);
      out.pwdMismatchError = document.body.innerText.includes('两次输入的新密码不一致');

      setVal(pw[2], 'abc123');
      setVal(pw[1], '123');
      if (btn) btn.click();
      await sleep(700);
      out.pwdShortError = document.body.innerText.includes('新密码至少 6 位');
    }
  }

  return JSON.stringify(out);
})()
