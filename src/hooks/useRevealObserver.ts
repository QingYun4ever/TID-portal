import { useEffect } from 'react';

/**
 * data-reveal 常驻观察器
 *
 * 全局的 useRevealScan 只在路由变化后扫描一次，无法覆盖「数据异步加载完成后才渲染」
 * 的区块（它们会一直停留在 opacity:0）。这里在 App 级别挂一个 MutationObserver，
 * 把此后新增的 [data-reveal] 元素持续注册进同一个 IntersectionObserver。
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observer!.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
  }
  return observer;
}

export function useRevealObserver() {
  useEffect(() => {
    const ob = getObserver();
    if (!ob) return;

    // 与全局 useRevealScan 共用同一构建结果，重复 observe 同一元素是幂等的
    const scan = (root: ParentNode & Node = document) => {
      if (root instanceof Element && root.matches('[data-reveal]:not(.is-in)')) ob.observe(root);
      root.querySelectorAll?.('[data-reveal]:not(.is-in)').forEach((n) => ob.observe(n));
    };

    scan();

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (n.nodeType === 1) scan(n as HTMLElement);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // 路由切换 / 首屏加载完成后补一次扫描
    const timer = setTimeout(() => scan(), 600);

    return () => {
      mo.disconnect();
      clearTimeout(timer);
    };
  }, []);
}

export default useRevealObserver;
