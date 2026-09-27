import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LogoMark } from './Brand';

/* =============================================================================
 * 首页背景大标识
 *
 * 首屏完整展示品牌标识；下滑离开首屏后，把同一个标识放大到远超视口，
 * 只露出「半个」在画面里，并做淡化处理。用固定定位，成为下滑后共享的背景层。
 *
 * 性能：
 *   · 淡入淡出直接写 style.opacity（ref），不经过 React —— 滚动时零重渲染；
 *   · 旋转放在外层 div 上（合成层 transform），不用 SVG 内部 <g> 旋转，
 *     后者每帧都要重新栅格化整张矢量图，是下滑卡顿的一个来源；
 *   · 完全透明时置为 visibility:hidden，让浏览器直接跳过这一层的绘制。
 * ========================================================================== */

export function BrandBackdrop({
  className,
  /** 目标不透明度（淡化的程度） */
  peakOpacity = 0.3,
  /** 相对视口高度的倍数 —— 越大越「只露出半个」 */
  scale = 1.6,
  /** 露出比例：0.5 = 正好半个 */
  reveal = 0.58,
  side = 'left',
}: {
  className?: string;
  peakOpacity?: number;
  scale?: number;
  reveal?: number;
  side?: 'left' | 'right';
}) {
  const layer = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);

  /* 尺寸随视口变化 —— 始终保持「大于视口、只露一半」的构图 */
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // 至少比视口高一截，同时不超过视口宽度的 1.4 倍，避免挤压内容
      setSize(Math.round(Math.min(vh * scale, vw * 1.4)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [scale]);

  /* 离开首屏后淡入 */
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = String(peakOpacity);
      return;
    }
    let raf = 0;
    let last = -1;
    let visible = true;
    const paint = () => {
      raf = 0;
      const vh = window.innerHeight;
      // 首屏内不显示；滚过 0.55 屏后开始淡入，到 1.15 屏完全显示
      const p = Math.min(1, Math.max(0, (window.scrollY - vh * 0.55) / (vh * 0.6)));
      const o = Math.round(p * peakOpacity * 200) / 200;
      if (o === last) return;
      last = o;
      el.style.opacity = String(o);
      const want = o > 0.001;
      if (want !== visible) {
        visible = want;
        // 看不见时彻底跳过绘制（旋转动画也随之停摆）
        el.style.visibility = want ? 'visible' : 'hidden';
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [peakOpacity]);

  if (!size) return null;

  // 露出 reveal 比例：把标识推出视口，使可见部分占 reveal
  const shift = size * (1 - reveal);

  return (
    <div aria-hidden className={cn('pointer-events-none fixed inset-0 -z-[6] overflow-hidden', className)}>
      <div
        ref={layer}
        className="absolute"
        style={{
          width: size,
          height: size,
          top: '50%',
          marginTop: -size / 2,
          [side]: -shift,
          opacity: 0,
        }}
      >
        <div
          className="h-full w-full"
          style={{ animation: 'sti-orbit 96s linear infinite', willChange: 'transform' }}
        >
          <LogoMark uid="bgmark" rayIntensity={0.7} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* 让标识向画面内侧自然淡出，避免边缘生硬 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            side === 'left'
              ? 'linear-gradient(90deg, rgb(var(--tw-black) / .34) 0%, rgb(var(--tw-black) / .10) 30%, transparent 58%)'
              : 'linear-gradient(270deg, rgb(var(--tw-black) / .34) 0%, rgb(var(--tw-black) / .10) 30%, transparent 58%)',
        }}
      />
    </div>
  );
}

export default BrandBackdrop;
