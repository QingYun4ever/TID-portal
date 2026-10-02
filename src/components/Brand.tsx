import React from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
 * 科技创新部 品牌标识
 *
 * 设计构成（来自 部门logo_3.0.pptx 的矢量母版）：
 *   · pulsar     脉冲星 —— 中心白热核心，沿 45° 双向发射射线
 *   · orbit-ring 缺口星环 —— 偏心的开口环
 *   · satellite  卫星 —— 位于星环外侧的高点
 *
 * 动画语义：
 *   缺口星环与卫星**同步绕脉冲星旋转**；脉冲星本身不转，只做射线脉冲。
 * ========================================================================== */

/** 缺口星环路径（DrawingML custGeom → SVG，1000×1000 坐标系） */
const RING_PATH =
  'M881 323C967 507 908 727 741 844C574 961 347 941 203 797C59 653 39 426 156 259C273 92 493 33 678 119L664 148C493 69 290 123 182 277C74 432 92 641 226 774C359 908 568 926 723 818C877 710 931 507 852 336Z';

export const CORE = { cx: 500, cy: 500, r: 88.9 };
export const SATELLITE = { cx: 852.8, cy: 144.5, r: 30.6 };

interface MarkProps {
  className?: string;
  style?: React.CSSProperties;
  /** 渐变 ID 唯一化，避免同页多个实例冲突 */
  uid?: string;
  /** 呼吸 / 流光等装饰动画 */
  animated?: boolean;
  /** 星环 + 卫星绕脉冲星旋转 */
  spin?: boolean;
  /** 旋转一圈的秒数（越小越快） */
  spinDuration?: number;
  /** 用当前文字颜色而非白色（浅色背景 / 单色场景） */
  monochrome?: boolean;
  /** 脉冲星射线的强度 0–1（背景大图建议调低避免抢内容） */
  rayIntensity?: number;
}

/**
 * 品牌标记（图标）
 */
export function LogoMark({
  className,
  style,
  uid = 'lm',
  animated = false,
  spin = false,
  spinDuration = 30,
  monochrome = false,
  rayIntensity = 1,
}: MarkProps) {
  const g = (n: string) => `${uid}-${n}`;

  return (
    <svg
      viewBox="-46 -46 1092 1092"
      className={cn('block', className)}
      style={style}
      role="img"
      aria-label="科技创新部"
    >
      <defs>
        {/* 射线：两端渐隐的白色光束
            （lm-* 类只在浅色主题下生效：CSS 的 stop-color / fill 会覆盖这里的属性值，
              白色部分换成深海军蓝、射线换成主色，深色主题下完全不受影响） */}
        <linearGradient id={g('ray')} x1="0" y1="0" x2="1" y2="0">
          <stop className="lm-ray" offset="0" stopColor="#fff" stopOpacity="0" />
          <stop className="lm-ray" offset="0.18" stopColor="#fff" stopOpacity="0.28" />
          <stop className="lm-ray" offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop className="lm-ray" offset="0.82" stopColor="#fff" stopOpacity="0.28" />
          <stop className="lm-ray" offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* 脉冲星核心：**纯实心白，无边缘淡化**（硬边），发光交给外层光晕 */}
        <radialGradient id={g('coreGlow')}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.80" />
          <stop offset="0.30" stopColor="#E0F2FE" stopOpacity="0.42" />
          <stop offset="0.58" stopColor="#BAE6FD" stopOpacity="0.14" />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity="0" />
        </radialGradient>

        {/* 星环：白 → 淡蓝 → 白 */}
        <linearGradient id={g('ring')} x1="0.05" y1="0" x2="0.95" y2="1">
          <stop className="lm-ink" offset="0" stopColor="#ffffff" />
          <stop className="lm-ink2" offset="0.35" stopColor="#E0F2FE" />
          <stop className="lm-ink2" offset="0.62" stopColor="#E0F2FE" />
          <stop className="lm-ink3" offset="0.85" stopColor="#BAE6FD" />
          <stop className="lm-ink" offset="1" stopColor="#ffffff" />
        </linearGradient>

        {/* 核心外晕 */}
        <radialGradient id={g('halo')}>
          <stop offset="0" stopColor="#BAE6FD" stopOpacity="0.34" />
          <stop offset="0.45" stopColor="#7DD3FC" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        <filter id={g('glow')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="20" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 射线柔化（让光束边缘自然消散） */}
        <filter id={g('soft')} x="-30%" y="-300%" width="160%" height="700%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* 脉冲星外晕 */}
      <circle cx={CORE.cx} cy={CORE.cy} r="430" fill={`url(#${g('halo')})`} />

      {/* ── 脉冲星射线（45° 双向光束）—— 必须清晰可见 ── */}
      {/* 这里原本挂着 sti-ray-pulse（0.82↔1 的透明度呼吸）。已移除：
         SVG 组透明度没有合成快路，每帧都要把整组（含下面那条 filter 高斯柔光）
         重新合成一次 —— 首屏的标识一直在视野里，这就是一笔不间断的光栅开销，
         而 18% 的透明度起伏几乎看不出来。呼吸交给外层的 .st-breathe 光晕。 */}
      <g transform="translate(500 500) rotate(45)" opacity={monochrome ? 0.42 : rayIntensity}>
        {/* 1. 最外层柔光 */}
        <rect x="-486" y="-58" width="972" height="116" fill={`url(#${g('ray')})`} opacity="0.20" filter={`url(#${g('soft')})`} />
        {/* 2. 主体光束 */}
        <rect x="-486" y="-19" width="972" height="38" fill={`url(#${g('ray')})`} opacity="0.46" />
        {/* 3. 亮芯 */}
        <rect x="-486" y="-7" width="972" height="14" fill={`url(#${g('ray')})`} opacity="0.86" />
        {/* 4. 白热一线 */}
        <rect className="lm-hot" x="-486" y="-2.2" width="972" height="4.4" fill="#ffffff" opacity="0.95" />
      </g>

      {/* ── 缺口星环 + 卫星：同步绕脉冲星旋转 ── */}
      <g
        style={
          spin
            ? {
                transformBox: 'view-box',
                transformOrigin: '500px 500px',
                animation: `sti-orbit ${spinDuration}s linear infinite`,
              }
            : undefined
        }
      >
        <path
          d={RING_PATH}
          fill={monochrome ? 'currentColor' : `url(#${g('ring')})`}
          fillRule="evenodd"
        />

        {/* 环上流光 */}
        {animated && (
          <path
            d={RING_PATH}
            fill="none"
            stroke="#F0F9FF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="150 3600"
            opacity="0.85"
            style={{ animation: 'sti-trace 7s linear infinite' }}
          />
        )}

        {/* 卫星（与星环同一旋转组，保证严格同步） */}
        <circle
          className={monochrome ? undefined : 'lm-inkf'}
          cx={SATELLITE.cx}
          cy={SATELLITE.cy}
          r={SATELLITE.r}
          fill={monochrome ? 'currentColor' : '#ffffff'}
        />
        {/* 卫星外圈的 3.2s 脉冲已移除：和核心的脉冲同频同相，视觉上只是重复一遍，
           却让同一张 SVG 每帧多一处失效区。常驻动效只留「环上流光 + 核心脉冲」两处。 */}
      </g>

      {/* ── 脉冲星核心（不随环旋转） ── */}
      {/* 1. 发光晕：画在核心之下，负责「发光」 */}
      <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r * 2.95} fill={`url(#${g('coreGlow')})`} />
      {/* 2. 核心本体：实心白，硬边，无渐隐 */}
      <circle
        className={monochrome ? undefined : 'lm-inkf'}
        cx={CORE.cx}
        cy={CORE.cy}
        r={CORE.r}
        fill={monochrome ? 'currentColor' : '#ffffff'}
      />
      {animated && (
        <circle
          cx={CORE.cx}
          cy={CORE.cy}
          r={CORE.r + 12}
          fill="none"
          stroke="#BAE6FD"
          strokeWidth="3"
          opacity="0.55"
          style={{ transformBox: 'view-box', transformOrigin: '500px 500px', animation: 'sti-pulse 3.2s ease-out infinite' }}
        />
      )}
    </svg>
  );
}

/** 背景品牌轨道：核心与射线固定，完整星环图层由 CSS 持续旋转，无 SVG 滤镜。 */
export function LogoWatermark({ className }: { className?: string }) {
  const uid = React.useId();
  const g = (name: string) => `${uid}-${name}`;

  return (
    <div className={cn('brand-watermark', className)} aria-hidden="true">
      <svg viewBox="-46 -46 1092 1092" width="100%" height="100%" className="brand-watermark-static" aria-hidden="true">
        <defs>
          <linearGradient id={g('beam')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="hsl(var(--watermark-ink))" stopOpacity="0" />
            <stop offset="0.22" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="hsl(var(--watermark-highlight))" stopOpacity="0.9" />
            <stop offset="0.78" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.22" />
            <stop offset="1" stopColor="hsl(var(--watermark-ink))" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={g('core-glow')}>
            <stop offset="0" stopColor="hsl(var(--watermark-highlight))" stopOpacity="0.2" />
            <stop offset="0.45" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.08" />
            <stop offset="1" stopColor="hsl(var(--watermark-ink))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CORE.cx} cy={CORE.cy} r="480" fill="none" stroke="hsl(var(--watermark-ink))" strokeWidth="1" strokeDasharray="2 14" opacity="0.16" />
        <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r * 1.45} fill="none" stroke="hsl(var(--watermark-ink))" strokeWidth="1" strokeDasharray="3 12" opacity="0.2" />
        <g transform={`translate(${CORE.cx} ${CORE.cy}) rotate(45)`}>
          <rect x="-486" y="-12" width="972" height="24" fill={`url(#${g('beam')})`} opacity="0.48" />
          <rect x="-486" y="-2.5" width="972" height="5" fill={`url(#${g('beam')})`} opacity="0.8" />
        </g>
        <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r * 2.5} fill={`url(#${g('core-glow')})`} />
        <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill="hsl(var(--watermark-highlight))" fillOpacity="0.045" stroke="hsl(var(--watermark-highlight))" strokeOpacity="0.6" strokeWidth="2" />
        <circle cx={CORE.cx} cy={CORE.cy} r="6" fill="hsl(var(--watermark-highlight))" fillOpacity="0.9" />
      </svg>
      <svg viewBox="-46 -46 1092 1092" width="100%" height="100%" className="brand-watermark-orbit" aria-hidden="true">
        <defs>
          <linearGradient id={g('ring')} x1="0.05" y1="0" x2="0.95" y2="1">
            <stop offset="0" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.65" />
            <stop offset="0.38" stopColor="hsl(var(--watermark-highlight))" stopOpacity="0.95" />
            <stop offset="0.7" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.8" />
            <stop offset="1" stopColor="hsl(var(--watermark-ink))" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={g('satellite-glow')}>
            <stop offset="0" stopColor="hsl(var(--watermark-highlight))" stopOpacity="0.38" />
            <stop offset="0.35" stopColor="hsl(var(--watermark-highlight))" stopOpacity="0.16" />
            <stop offset="1" stopColor="hsl(var(--watermark-ink))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={RING_PATH} fill={`url(#${g('ring')})`} fillRule="evenodd" />
        <circle cx={SATELLITE.cx} cy={SATELLITE.cy} r={SATELLITE.r * 3.5} fill={`url(#${g('satellite-glow')})`} />
        <circle cx={SATELLITE.cx} cy={SATELLITE.cy} r={SATELLITE.r} fill="hsl(var(--watermark-highlight))" fillOpacity="0.95" />
      </svg>
    </div>
  );
}

/* =============================================================================
 * 完整字标（图标 + 中文名 + 分割线 + 英文名），比例取自 pptx 母版
 * ========================================================================== */
interface LockupProps {
  className?: string;
  uid?: string;
  /** 图标尺寸（px），文字随之缩放 */
  size?: number;
  animated?: boolean;
  spin?: boolean;
  /** 仅图标 */
  iconOnly?: boolean;
  /** 上下堆叠（用于居中展示 / 页脚） */
  stacked?: boolean;
}

export function LogoLockup({
  className,
  uid = 'lk',
  size = 44,
  animated = false,
  spin = false,
  iconOnly = false,
  stacked = false,
}: LockupProps) {
  const cnSize = size * 0.44; // 中文名 ≈ 图标高度的 0.44 倍
  const enSize = size * 0.112;

  if (iconOnly) return <LogoMark uid={uid} className={cn(className)} animated={animated} spin={spin} />;

  if (stacked)
    return (
      <div className={cn('flex flex-col items-center gap-5 text-center', className)}>
        <LogoMark
          uid={uid}
          animated={animated}
          spin={spin}
          style={{ width: size * 2.4, height: size * 2.4 }}
          className="shrink-0"
        />
        <div className="flex flex-col items-center">
          <div
            className="font-bold leading-none tracking-[0.02em] text-white"
            style={{ fontSize: cnSize * 1.35, fontFamily: 'var(--font-display)' }}
          >
            科技创新部
          </div>
          <div className="my-3 h-px w-16 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="font-medium leading-none text-white/60" style={{ fontSize: enSize * 1.25, letterSpacing: '0.3em' }}>
            TECHNOLOGY &amp; INNOVATION DEPT.
          </div>
        </div>
      </div>
    );

  return (
    <div className={cn('flex items-center gap-3.5', className)}>
      <LogoMark uid={uid} animated={animated} spin={spin} className="shrink-0" style={{ width: size, height: size }} />
      <div className="flex min-w-0 flex-col justify-center">
        <div
          className="whitespace-nowrap font-bold leading-none tracking-[0.06em] text-white"
          style={{ fontSize: cnSize, fontFamily: 'var(--font-display)' }}
        >
          科技创新部
        </div>
        <div
          className="mt-[0.5em] whitespace-nowrap font-medium leading-none text-white/45"
          style={{ fontSize: enSize, letterSpacing: '0.26em' }}
        >
          TECHNOLOGY &amp; INNOVATION DEPT.
        </div>
      </div>
    </div>
  );
}

/** 便捷组件：导航栏品牌 */
export function BrandWordmark({ className, size = 34 }: { className?: string; size?: number }) {
  return <LogoLockup uid="nav" size={size} className={className} />;
}

export default LogoMark;
