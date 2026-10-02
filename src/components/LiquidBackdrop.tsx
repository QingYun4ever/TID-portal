import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
 * 主题背景层：浅色透光，暗色只留极淡的蓝色纵深。
 *
 * 配色纪律：只有「黑、白、一点蓝」。不再使用紫 / 青绿等多色光雾 ——
 * 背景的职责是提供纵深与质感，不是抢内容。
 *
 *   · 蓝色光雾   两团低饱和蓝光，缓慢漂移；深色主题显著降低浓度
 *   · 点线网格   76px 网格，随指针轻微视差
 *   · 指针聚光   浅色保留柔光，暗色仅留极弱照明
 *   · 上下渐暗   不遮盖主题底色的轻微纵深
 *
 * 性能纪律（背景是全屏层，任何一帧的浪费都会直接体现在滚动手感上）：
 *   · 光雾用多段径向渐变做出柔边，不再叠 filter: blur() ——
 *     大半径模糊会让这一层每次重绘都走一遍滤镜通道，代价远高于渐变本身；
 *   · 指针和网格只更新各自的 transform，rAF 追到位就自动停；
 *   · 全部 pointer-events: none。
 * ========================================================================== */

export function LiquidBackdrop({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const grid = gridRef.current;
    const pointer = pointerRef.current;
    if (!grid || !pointer) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.3;
    let cx = tx;
    let cy = ty;

    const loop = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      pointer.style.transform = `translate3d(${Math.round(cx) - 440}px, ${Math.round(cy) - 440}px, 0)`;
      grid.style.transform = `translate3d(${((cx - window.innerWidth / 2) / 52).toFixed(2)}px, ${((cy - window.innerHeight / 2) / 52).toFixed(2)}px, 0)`;
      // 指针追到位就停；常驻光雾继续由 CSS 合成线程驱动。
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.4 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
      style={{ opacity: intensity }}
    >
      {/* 蓝色光雾 —— 柔边由渐变段本身给出；主题 CSS 调节浓度。
          浅色保留透光层次，深色只留微弱蓝光，避免灰雾盖住底色。 */}
      <div
        className="liquid-orb animate-drift absolute left-1/2 top-[-16%] h-[74vmax] w-[74vmax] -translate-x-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(125,180,255,.16) 0%, rgba(125,180,255,.115) 22%, rgba(125,180,255,.055) 44%, rgba(125,180,255,.018) 62%, transparent 78%)',
        }}
      />
      <div
        className="liquid-orb animate-drift absolute bottom-[-26%] left-[8%] h-[58vmax] w-[58vmax] rounded-full"
        style={{
          animationDelay: '-11s',
          background:
            'radial-gradient(circle at 50% 50%, rgba(186,230,253,.10) 0%, rgba(186,230,253,.06) 30%, rgba(186,230,253,.022) 54%, transparent 74%)',
        }}
      />

      {/* 点线网格（随指针轻微视差） */}
      <div
        ref={gridRef}
        className="absolute inset-[-6%] opacity-[0.42]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--tw-white) / .05) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--tw-white) / .05) 1px, transparent 1px)',
          backgroundSize: '76px 76px',
          transform: 'translate3d(0, 0, 0)',
          maskImage: 'radial-gradient(76% 60% at 50% 34%, #000 6%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(76% 60% at 50% 34%, #000 6%, transparent 72%)',
        }}
      />

      {/* 顶部光感按主题收敛，底部沉暗保持主题底色。 */}
      <div className="liquid-top-light absolute inset-x-0 top-0 h-[38vh] bg-gradient-to-b from-white/[0.035] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-black to-transparent" />

      {/* 聚光的渐变固定不重绘，只平移整层；强度由主题 token 决定。
          深色极弱冷白，浅色淡天蓝。保留在底部渐暗层之后。 */}
      <div
        ref={pointerRef}
        className="liquid-pointer-glow absolute left-0 top-0 hidden h-[880px] w-[880px] lg:block"
        style={{
          background:
            'radial-gradient(440px circle at center, rgb(var(--orb) / var(--pointer-glow-opacity)) 0%, rgb(var(--orb) / calc(var(--pointer-glow-opacity) * 0.55)) 25%, rgb(var(--orb) / calc(var(--pointer-glow-opacity) * 0.18)) 55%, rgb(var(--orb) / 0) 100%)',
          transform: 'translate3d(calc(50vw - 440px), calc(30vh - 440px), 0)',
        }}
      />
    </div>
  );
}

/* =============================================================================
 * 局部光晕 —— 默认冷白，避免彩色堆砌
 *
 * 用 color-mix 造出高斯式的多段衰减，替代 filter: blur()。
 * 观感几乎一致，但不再让所在图层每次重绘都跑一遍模糊。
 * ========================================================================== */
export function GlowOrb({
  className,
  color = 'rgb(var(--orb) / .07)',
  size = 420,
  style,
}: {
  className?: string;
  /** 默认走 --orb 通道：深色主题是冷白，浅色主题自动变成淡天蓝 */
  color?: string;
  size?: number;
  /** 用于错开 .st-breathe 的相位（animationDelay: '-6s'）等场合 */
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: [
          'radial-gradient(circle,',
          `${color} 0%,`,
          `color-mix(in srgb, ${color}, transparent 34%) 26%,`,
          `color-mix(in srgb, ${color}, transparent 68%) 46%,`,
          `color-mix(in srgb, ${color}, transparent 89%) 62%,`,
          'transparent 78%)',
        ].join(' '),
        ...style,
      }}
    />
  );
}

/* =============================================================================
 * 极细网格纹理（区块背景）
 * ========================================================================== */
export function GridTexture({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgb(var(--tw-white) / .035) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--tw-white) / .035) 1px, transparent 1px)',
        backgroundSize: `${size}px ${size}px`,
        maskImage: 'radial-gradient(70% 60% at 50% 50%, #000 10%, transparent 76%)',
        WebkitMaskImage: 'radial-gradient(70% 60% at 50% 50%, #000 10%, transparent 76%)',
      }}
    />
  );
}

/* =============================================================================
 * 噪点纹理（胶片颗粒）
 *
 * 不用 mix-blend-mode：固定全屏的混合层会让它下面的一切在每帧都重新合成，
 * 是下滑卡顿里最不划算的一项。低透明度叠加的观感差别肉眼不可见。
 * ========================================================================== */
export function NoiseTexture({ opacity = 0.022 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5]"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: '180px 180px',
      }}
    />
  );
}
