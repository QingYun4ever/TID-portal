import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const RING_PATH = 'M881 323C967 507 908 727 741 844C574 961 347 941 203 797C59 653 39 426 156 259C273 92 493 33 678 119L664 148C493 69 290 123 182 277C74 432 92 641 226 774C359 908 568 926 723 818C877 710 931 507 852 336Z';
export const CORE = { cx: 500, cy: 500, r: 88.9 };
export const SATELLITE = { cx: 852.8, cy: 144.5, r: 30.6 };
/**
 * 品牌标记（图标）
 */
export function LogoMark({ className, style, uid = 'lm', animated = false, spin = false, spinDuration = 30, monochrome = false, rayIntensity = 1, }) {
    const g = (n) => `${uid}-${n}`;
    return (_jsxs("svg", { viewBox: "-46 -46 1092 1092", className: cn('block', className), style: style, role: "img", "aria-label": "\u79D1\u6280\u521B\u65B0\u90E8", children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: g('ray'), x1: "0", y1: "0", x2: "1", y2: "0", children: [_jsx("stop", { offset: "0", stopColor: "#fff", stopOpacity: "0" }), _jsx("stop", { offset: "0.18", stopColor: "#fff", stopOpacity: "0.28" }), _jsx("stop", { offset: "0.5", stopColor: "#fff", stopOpacity: "1" }), _jsx("stop", { offset: "0.82", stopColor: "#fff", stopOpacity: "0.28" }), _jsx("stop", { offset: "1", stopColor: "#fff", stopOpacity: "0" })] }), _jsxs("radialGradient", { id: g('coreGlow'), children: [_jsx("stop", { offset: "0", stopColor: "#ffffff", stopOpacity: "0.80" }), _jsx("stop", { offset: "0.30", stopColor: "#E0F2FE", stopOpacity: "0.42" }), _jsx("stop", { offset: "0.58", stopColor: "#BAE6FD", stopOpacity: "0.14" }), _jsx("stop", { offset: "1", stopColor: "#7DD3FC", stopOpacity: "0" })] }), _jsxs("linearGradient", { id: g('ring'), x1: "0.05", y1: "0", x2: "0.95", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "#ffffff" }), _jsx("stop", { offset: "0.35", stopColor: "#E0F2FE" }), _jsx("stop", { offset: "0.62", stopColor: "#E0F2FE" }), _jsx("stop", { offset: "0.85", stopColor: "#BAE6FD" }), _jsx("stop", { offset: "1", stopColor: "#ffffff" })] }), _jsxs("radialGradient", { id: g('halo'), children: [_jsx("stop", { offset: "0", stopColor: "#BAE6FD", stopOpacity: "0.34" }), _jsx("stop", { offset: "0.45", stopColor: "#7DD3FC", stopOpacity: "0.12" }), _jsx("stop", { offset: "1", stopColor: "#000", stopOpacity: "0" })] }), _jsxs("filter", { id: g('glow'), x: "-60%", y: "-60%", width: "220%", height: "220%", children: [_jsx("feGaussianBlur", { stdDeviation: "20", result: "b" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "b" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsx("filter", { id: g('soft'), x: "-30%", y: "-300%", width: "160%", height: "700%", children: _jsx("feGaussianBlur", { stdDeviation: "9" }) })] }), _jsx("circle", { cx: CORE.cx, cy: CORE.cy, r: "430", fill: `url(#${g('halo')})` }), _jsxs("g", { transform: "translate(500 500) rotate(45)", opacity: monochrome ? 0.42 : rayIntensity, children: [_jsx("rect", { x: "-486", y: "-58", width: "972", height: "116", fill: `url(#${g('ray')})`, opacity: "0.20", filter: `url(#${g('soft')})` }), _jsx("rect", { x: "-486", y: "-19", width: "972", height: "38", fill: `url(#${g('ray')})`, opacity: "0.46" }), _jsx("rect", { x: "-486", y: "-7", width: "972", height: "14", fill: `url(#${g('ray')})`, opacity: "0.86" }), _jsx("rect", { x: "-486", y: "-2.2", width: "972", height: "4.4", fill: "#ffffff", opacity: "0.95" })] }), _jsxs("g", { style: spin
                    ? {
                        transformBox: 'view-box',
                        transformOrigin: '500px 500px',
                        animation: `sti-orbit ${spinDuration}s linear infinite`,
                    }
                    : undefined, children: [_jsx("path", { d: RING_PATH, fill: monochrome ? 'currentColor' : `url(#${g('ring')})`, fillRule: "evenodd" }), animated && (_jsx("path", { d: RING_PATH, fill: "none", stroke: "#F0F9FF", strokeWidth: "8", strokeLinecap: "round", strokeDasharray: "150 3600", opacity: "0.85", style: { animation: 'sti-trace 7s linear infinite' } })), _jsx("circle", { cx: SATELLITE.cx, cy: SATELLITE.cy, r: SATELLITE.r, fill: monochrome ? 'currentColor' : '#ffffff' })] }), _jsx("circle", { cx: CORE.cx, cy: CORE.cy, r: CORE.r * 2.95, fill: `url(#${g('coreGlow')})` }), _jsx("circle", { cx: CORE.cx, cy: CORE.cy, r: CORE.r, fill: monochrome ? 'currentColor' : '#ffffff' }), animated && (_jsx("circle", { cx: CORE.cx, cy: CORE.cy, r: CORE.r + 12, fill: "none", stroke: "#BAE6FD", strokeWidth: "3", opacity: "0.55", style: { transformBox: 'view-box', transformOrigin: '500px 500px', animation: 'sti-pulse 3.2s ease-out infinite' } }))] }));
}
export function LogoLockup({ className, uid = 'lk', size = 44, animated = false, spin = false, iconOnly = false, stacked = false, }) {
    const cnSize = size * 0.44; // 中文名 ≈ 图标高度的 0.44 倍
    const enSize = size * 0.112;
    if (iconOnly)
        return _jsx(LogoMark, { uid: uid, className: cn(className), animated: animated, spin: spin });
    if (stacked)
        return (_jsxs("div", { className: cn('flex flex-col items-center gap-5 text-center', className), children: [_jsx(LogoMark, { uid: uid, animated: animated, spin: spin, style: { width: size * 2.4, height: size * 2.4 }, className: "shrink-0" }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "font-bold leading-none tracking-[0.02em] text-white", style: { fontSize: cnSize * 1.35, fontFamily: 'var(--font-display)' }, children: "\u79D1\u6280\u521B\u65B0\u90E8" }), _jsx("div", { className: "my-3 h-px w-16 bg-gradient-to-r from-transparent via-white/60 to-transparent" }), _jsx("div", { className: "font-medium leading-none text-white/60", style: { fontSize: enSize * 1.25, letterSpacing: '0.3em' }, children: "TECHNOLOGY & INNOVATION DEPT." })] })] }));
    return (_jsxs("div", { className: cn('flex items-center gap-3.5', className), children: [_jsx(LogoMark, { uid: uid, animated: animated, spin: spin, className: "shrink-0", style: { width: size, height: size } }), _jsxs("div", { className: "flex min-w-0 flex-col justify-center", children: [_jsx("div", { className: "whitespace-nowrap font-bold leading-none tracking-[0.06em] text-white", style: { fontSize: cnSize, fontFamily: 'var(--font-display)' }, children: "\u79D1\u6280\u521B\u65B0\u90E8" }), _jsx("div", { className: "mt-[0.5em] whitespace-nowrap font-medium leading-none text-white/45", style: { fontSize: enSize, letterSpacing: '0.26em' }, children: "TECHNOLOGY & INNOVATION DEPT." })] })] }));
}
/** 便捷组件：导航栏品牌 */
export function BrandWordmark({ className, size = 34 }) {
    return _jsx(LogoLockup, { uid: "nav", size: size, className: className });
}
export default LogoMark;
