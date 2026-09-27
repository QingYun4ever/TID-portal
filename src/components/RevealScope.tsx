import { useCallback, useEffect, useState } from 'react';

/* =============================================================================
 * 页面级滚动揭示作用域
 *
 * 全局的 useRevealScan（App.tsx）只在路由变化后约 40ms 扫描一次：
 *  - 懒加载页面此时 chunk 往往还没挂载；
 *  - 数据异步返回后才渲染出的 [data-reveal] 元素也已经错过扫描。
 * 结果这些元素会一直停在 opacity:0。
 *
 * 本 hook 在页面内部维护一个**局部** IntersectionObserver（参数与全局完全一致：
 * rootMargin: 0 0 -8% 0px、threshold: 0.06，进入视口加 .is-in），并用
 * MutationObserver 在子节点变化时重新扫描，保证本页所有 [data-reveal] 元素
 * 最终都能正常揭示。样式复用既有 CSS，不新增任何规则。
 *
 * 用法：`const revealRef = useRevealScope<HTMLDivElement>();` 然后
 * `<div ref={revealRef}>…</div>`（callback ref，节点更换时自动重新接管）。
 * ========================================================================== */

export function useRevealScope<T extends HTMLElement = HTMLDivElement>() {
  const [root, setRoot] = useState<T | null>(null);

  /* callback ref 必须稳定，否则每次渲染都会触发 detach/attach */
  const setRef = useCallback((node: T | null) => setRoot(node), []);

  useEffect(() => {
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    const scan = () => {
      if (root.hasAttribute('data-reveal') && !root.classList.contains('is-in')) io.observe(root);
      root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((node) => io.observe(node));
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [root]);

  return setRef;
}

export default useRevealScope;
