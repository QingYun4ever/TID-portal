import { useCallback, useSyncExternalStore } from 'react';

/* =============================================================================
 * 主题（深色 / 浅色）
 *
 * · 主题只体现为 <html> 上的一个类：.dark 或 .light。
 *   所有颜色都走 CSS 变量（见 index.css 的 :root / html.light），
 *   切换主题 = 换一个类，React 组件树不需要因此重渲染。
 * · 首帧之前由 index.html 里的内联脚本先把类挂上，避免「先黑后白」的闪烁；
 *   这里的逻辑必须和那段脚本保持一致（同一个 KEY、同一套回退规则）。
 * · 用户没手动选过时跟随系统（prefers-color-scheme），选过就记住。
 * ========================================================================== */
export type Theme = 'dark' | 'light';

const KEY = 'sti-theme';
const META_COLOR: Record<Theme, string> = { dark: '#000000', light: '#f4f6f9' };

const subs = new Set<() => void>();

function readSaved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function apply(t: Theme) {
  const root = document.documentElement;
  if (getTheme() === t && root.classList.contains(t)) return;

  /* 切换的那一帧关掉所有过渡：否则几百个元素会各自用 0.3~0.5s
     从旧颜色渐变到新颜色，既拖泥带水又会一次性触发大量重绘 */
  root.classList.add('theme-switching');
  root.classList.toggle('light', t === 'light');
  root.classList.toggle('dark', t === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[t]);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));

  subs.forEach((fn) => fn());
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* 隐私模式下写不进去也没关系，本次会话仍然生效 */
  }
  apply(t);
}

/* 没有手动选择过时，跟随系统的深浅切换 */
if (typeof window !== 'undefined' && typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!readSaved()) apply(systemTheme());
  });
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);
  const toggle = useCallback(() => setTheme(getTheme() === 'light' ? 'dark' : 'light'), []);
  return { theme, setTheme, toggle };
}
