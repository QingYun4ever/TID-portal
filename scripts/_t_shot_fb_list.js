/* 截图：/feedback 留言列表 + 官方回复 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = document.querySelector('#board');
  if (!el) throw new Error('未找到 #board');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 120, behavior: 'instant' });
  await sleep(1600);
  return 'ok';
})()
