import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
 * 液态玻璃背景层
 *
 * 配色纪律：只有「黑、白、一点蓝」。不再使用紫 / 青绿等多色光雾 ——
 * 背景的职责是提供纵深与质感，不是抢内容。
 *
 *   · 冷白光雾   两团低饱和冷白光，缓慢漂移（唯一带色相的层次）
 *   · 点线网格   76px 网格，随指针轻微视差
 *   · 指针聚光   跟随指针的柔光，制造「玻璃被照亮」的错觉
 *   · 上下渐暗   做出水下纵深
 *
 * 性能纪律（背景是全屏层，任何一帧的浪费都会直接体现在滚动手感上）：
 *   · 光雾用多段径向渐变做出柔边，不再叠 filter: blur() ——
 *     大半径模糊会让这一层每次重绘都走一遍滤镜通道，代价远高于渐变本身；
 *   · 指针跟随的 rAF 只在指针真的移动时运行，追到位就自动停；
 *   · 全部 pointer-events: none。
 * ========================================================================== */

export function LiquidBackdrop({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.3;
    let cx = tx;
    let cy = ty;

    const loop = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      el.style.setProperty('--px', `${Math.round(cx)}px`);
      el.style.setProperty('--py', `${Math.round(cy)}px`);
      el.style.setProperty('--gx', `${((cx - window.innerWidth / 2) / 52).toFixed(2)}px`);
      el.style.setProperty('--gy', `${((cy - window.innerHeight / 2) / 52).toFixed(2)}px`);
      // 追到位就停：静止的页面不应该有任何一帧开销
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
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
      style={{ opacity: intensity }}
    >
      {/* 冷白光雾 —— 仅两团，低饱和，柔边由渐变段本身给出
          （.liquid-orb：浅色主题下略提浓度，给毛玻璃留一点可透的底色） */}
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
        className="absolute inset-[-6%] opacity-[0.42]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--tw-white) / .05) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--tw-white) / .05) 1px, transparent 1px)',
          backgroundSize: '76px 76px',
          transform: 'translate3d(var(--gx,0), var(--gy,0), 0)',
          maskImage: 'radial-gradient(76% 60% at 50% 34%, #000 6%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(76% 60% at 50% 34%, #000 6%, transparent 72%)',
        }}
      />

      {/* 指针聚光（--orb：深色主题是白光，浅色主题是淡天蓝 —— 浅底上白加白等于没加） */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            'radial-gradient(500px circle at var(--px, 50%) var(--py, 30%), rgb(var(--orb) / .055), transparent 62%)',
        }}
      />

      {/* 顶部一道冷光，底部沉暗 */}
      <div className="absolute inset-x-0 top-0 h-[38vh] bg-gradient-to-b from-white/[0.035] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-black to-transparent" />
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
