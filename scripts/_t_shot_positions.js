/* 截图：/join 招新岗位区 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = document.querySelector('#positions');
  if (!el) throw new Error('未找到 #positions');
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'instant' });
  await sleep(1600);
  return 'ok';
})()
