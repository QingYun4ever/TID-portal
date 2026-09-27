/* 诊断：统计 data-reveal 元素的 is-in 情况 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2500);
  const all = [...document.querySelectorAll('[data-reveal]')];
  const inCount = all.filter((n) => n.classList.contains('is-in')).length;
  const hidden = all.filter((n) => !n.classList.contains('is-in'));
  const opacity = hidden.length ? getComputedStyle(hidden[hidden.length - 1]).opacity : 'n/a';
  document.title = 'reveal total=' + all.length + ' isIn=' + inCount + ' hidden=' + hidden.length + ' lastOpacity=' + opacity;
  return 'ok';
})()
