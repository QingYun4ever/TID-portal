import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/* =============================================================================
 * 轨道粒子场 (Orbital Field)
 *
 * 首页首屏的签名动画。把 Logo 的图形母题「核心 + 偏心轨道 + 卫星」转成运动图形：
 *   · 粒子沿倾斜椭圆轨道运行，各自角速度不同（近核心更快，开普勒式观感）
 *   · 邻近粒子间绘制极淡连线，形成星图/点线网格
 *   · 一颗卫星沿轨道运行并留下拖尾
 *   · 指针产生引力：附近粒子被轻微吸引并提亮
 *   · 一条水平棱镜光束穿过核心（呼应 Logo 的 45° 光束，做水平化处理）
 *
 * 性能：DPR 上限 2、粒子数按视口面积封顶、离屏自动暂停、
 *       连线用空间哈希网格避免 O(n²)、prefers-reduced-motion 下静态渲染一帧。
 * ========================================================================== */

interface Particle {
  /** 所属轨道 */ lane: number;
  /** 轨道半长轴 / 半短轴（相对核心的像素半径） */
  a: number;
  b: number;
  /** 当前角度 & 角速度 */
  angle: number;
  speed: number;
  /** 轨道面倾斜（弧度） */
  tilt: number;
  /** 视觉属性 */
  size: number;
  alpha: number;
  /** 亮度随机相位，用于闪烁 */
  phase: number;
  hue: number;
  /** 自由粒子（不参与轨道，只做星尘） */
  free?: boolean;
}

interface Lane {
  a: number;
  b: number;
  tilt: number;
  /** 相位累积 */
  phase: number;
  speed: number;
  hueA: number;
  hueB: number;
}

export function OrbitalCanvas({
  className,
  density = 1,
  interactive = true,
}: {
  className?: string;
  density?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let particles: Particle[] = [];
    let lanes: Lane[] = [];
    let base = 400;
    let satellite = { angle: 0, a: 0, b: 0, tilt: 0, trail: [] as { x: number; y: number; a: number }[] };

    /* 画布在页面中的位置：缓存起来，避免每次 pointermove 都触发强制同步布局 */
    let boxX = 0;
    let boxY = 0;
    let boxDirty = true;

    /* 指针状态（平滑插值） */
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    /* ------------------------------ 辉光精灵 ------------------------------ */
    /* 亮粒子的柔光原本每颗每帧都要 createRadialGradient —— 上百颗 × 60fps，
       每秒上万个渐变对象。预渲染成一张 64px 精灵，之后只做 drawImage。 */
    let glow: HTMLCanvasElement | null = null;
    (function buildGlow() {
      const S = 64;
      const c = document.createElement('canvas');
      c.width = S;
      c.height = S;
      const g = c.getContext('2d');
      if (!g) return;
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, 'hsla(206, 45%, 88%, 1)');
      gr.addColorStop(0.5, 'hsla(206, 45%, 88%, 0.34)');
      gr.addColorStop(1, 'hsla(206, 45%, 88%, 0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      glow = c;
    })();

    /* ------------------------------ 尺寸与粒子 ------------------------------ */
    function resize() {
      const rect = wrap!.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width;
      H = rect.height;
      boxX = rect.left;
      boxY = rect.top;
      boxDirty = false;
      canvas!.width = Math.max(1, Math.floor(W * dpr));
      canvas!.height = Math.max(1, Math.floor(H * dpr));
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      base = Math.min(W, H) * 0.40;
      const LANES = 7;

      lanes = [];
      for (let i = 0; i < LANES; i++) {
        const k = i / (LANES - 1); // 0 → 1
        const a = base * (0.40 + k * 1.30);
        const ecc = 0.10 + k * 0.16;
        lanes.push({
          a,
          b: a * (1 - ecc),
          // 倾斜角随半径轻微旋转，形成「漩涡」的层次感
          tilt: -0.36 + i * 0.045,
          phase: Math.random() * Math.PI * 2,
          // 开普勒式：外圈更慢
          speed: 0.085 * Math.pow(base / a, 0.9),
          // 色相收窄在蓝白之间（202→214），不再出现紫色
          hueA: 202 + k * 8,
          hueB: 208 + k * 6,
        });
      }

      particles = [];
      // 沿轨道分布的粒子：密度向外递减，使内圈更亮更密（吸积盘观感）
      for (let i = 0; i < LANES; i++) {
        const lane = lanes[i];
        const k = i / (LANES - 1);
        const n = Math.round((26 - k * 13) * density);
        for (let j = 0; j < n; j++) {
          // 沿轨道尽量均匀分布（加少量抖动，避免机械感）
          const jitter = 0.75 + Math.random() * 0.5;
          particles.push({
            lane: i,
            a: lane.a * jitter,
            b: lane.b * jitter,
            angle: (j / n) * Math.PI * 2 + Math.random() * 0.22,
            speed: lane.speed * (0.9 + Math.random() * 0.2),
            tilt: lane.tilt + (Math.random() - 0.5) * 0.05,
            size: 0.7 + Math.random() * 1.35,
            alpha: (0.34 + Math.random() * 0.52) * (1 - k * 0.28),
            phase: Math.random() * Math.PI * 2,
            hue: lane.hueA + Math.random() * (lane.hueB - lane.hueA),
          });
        }
      }

      // 稀疏自由星尘：为画面提供纵深
      const dust = Math.round(Math.min(70, (W * H) / 26000) * density);
      for (let i = 0; i < dust; i++) {
        const r = base * (0.2 + Math.pow(Math.random(), 0.7) * 2.4);
        const t = Math.random() * Math.PI * 2;
        particles.push({
          lane: -1,
          free: true,
          a: r,
          b: r,
          angle: t,
          speed: 0,
          tilt: 0,
          size: 0.4 + Math.random() * 0.8,
          alpha: 0.1 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
          hue: 204 + Math.random() * 8,
        });
      }

      const sa = base * 1.42;
      satellite = { angle: -0.9, a: sa, b: sa * 0.82, tilt: -0.30, trail: [] };
    }

    /* ------------------------------ 绘制一帧 ------------------------------ */
    function frame(time: number) {
      if (!running) return;
      const t = time / 1000;

      /* 位置只在「滚动过」之后重量一次，且是在 rAF 里量 —— 不会造成强制回流 */
      if (boxDirty) {
        const r = wrap!.getBoundingClientRect();
        boxX = r.left;
        boxY = r.top;
        boxDirty = false;
      }

      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = 'lighter';

      const cx = W / 2;
      const cy = H * 0.47;

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      ctx!.save();
      ctx!.translate(cx, cy);

      /* --- 1. 棱镜光束（水平，穿过核心） --- */
      const beamW = Math.min(W * 0.82, 1040);
      const bg = ctx!.createLinearGradient(-beamW / 2, 0, beamW / 2, 0);
      bg.addColorStop(0, 'rgba(186,230,253,0)');
      bg.addColorStop(0.5, `rgba(224,242,254,${(0.15 + Math.sin(t * 0.7) * 0.04).toFixed(3)})`);
      bg.addColorStop(1, 'rgba(186,230,253,0)');
      ctx!.fillStyle = bg;
      ctx!.fillRect(-beamW / 2, -1.1, beamW, 2.2);

      const bh = ctx!.createLinearGradient(-beamW / 2, 0, beamW / 2, 0);
      bh.addColorStop(0, 'rgba(186,230,253,0)');
      bh.addColorStop(0.5, 'rgba(186,230,253,0.045)');
      bh.addColorStop(1, 'rgba(186,230,253,0)');
      ctx!.fillStyle = bh;
      ctx!.fillRect(-beamW / 2, -24, beamW, 48);

      /* --- 2. 轨道导引线（让「轨道」结构可读） --- */
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        if (!reduced) lane.phase += lane.speed * 0.016;
        const k = i / (lanes.length - 1);
        ctx!.save();
        ctx!.rotate(lane.tilt);
        ctx!.strokeStyle = `hsla(${lane.hueA}, 35%, 92%, ${(0.05 + (1 - k) * 0.04).toFixed(3)})`;
        ctx!.lineWidth = 0.7;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, lane.a, lane.b, 0, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }

      /* --- 3. 轨道粒子 --- */
      const pts: { x: number; y: number; a: number; hue: number }[] = [];
      for (const p of particles) {
        const laneSpeed = p.free ? 0 : p.speed;
        if (!reduced) p.angle += laneSpeed * 0.016;

        const cosT = Math.cos(p.tilt);
        const sinT = Math.sin(p.tilt);
        const ex = Math.cos(p.angle) * p.a;
        const ey = Math.sin(p.angle) * p.b;
        let x = ex * cosT - ey * sinT;
        let y = ex * sinT + ey * cosT;

        // 指针引力
        let boost = 0;
        if (interactive && pointer.active) {
          const ddx = pointer.x - cx - x;
          const ddy = pointer.y - cy - y;
          const d2 = ddx * ddx + ddy * ddy;
          const R = 200;
          if (d2 < R * R && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) ** 2;
            x += (ddx / d) * f * 28;
            y += (ddy / d) * f * 28;
            boost = f;
          }
        }

        const twinkle = 0.8 + Math.sin(t * 1.6 + p.phase) * 0.2;
        const alpha = Math.min(1, (p.alpha + boost * 0.65) * twinkle);
        const r = p.size * (1 + boost * 0.9);

        pts.push({ x, y, a: alpha, hue: p.hue });

        // 粒子本体：低饱和 → 近乎白，只留一点蓝
        ctx!.fillStyle = `hsla(${p.hue}, 26%, ${93 + boost * 5}%, ${alpha.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();

        if (glow && (p.alpha > 0.52 || boost > 0.3)) {
          const R = r * 8;
          ctx!.globalAlpha = Math.min(1, alpha * 0.36);
          ctx!.drawImage(glow, x - R, y - R, R * 2, R * 2);
          ctx!.globalAlpha = 1;
        }
      }

      /* --- 4. 邻近连线 —— 沿轨道编织星图 --- */
      {
        const CELL = 118;
        /* 用整数键代替字符串键：原本每帧要拼上千个 `${gx},${gy}`，
           这些临时字符串全是要回收的垃圾，直接体现为滚动时的掉帧毛刺 */
        const key = (gx: number, gy: number) => (gx + 2048) * 4096 + (gy + 2048);
        const grid = new Map<number, number[]>();
        for (let i = 0; i < pts.length; i++) {
          const k = key(Math.floor(pts[i].x / CELL), Math.floor(pts[i].y / CELL));
          const arr = grid.get(k);
          if (arr) arr.push(i);
          else grid.set(k, [i]);
        }
        const maxDist = CELL * 1.12;
        const maxDist2 = maxDist * maxDist;
        ctx!.lineWidth = 0.55;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const gx = Math.floor(p.x / CELL);
          const gy = Math.floor(p.y / CELL);
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const arr = grid.get(key(gx + dx, gy + dy));
              if (!arr) continue;
              for (const j of arr) {
                if (j <= i) continue;
                const q = pts[j];
                const ddx = q.x - p.x;
                const ddy = q.y - p.y;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 > maxDist2) continue;
                const k = 1 - Math.sqrt(d2) / maxDist;
                // 连线保持克制：只做「隐约的星图」，不喧宾夺主
                const alpha = k * k * 0.13 * Math.min(1.4, (p.a + q.a) * 1.7);
                if (alpha < 0.016) continue;
                ctx!.strokeStyle = `hsla(${(p.hue + q.hue) / 2}, 30%, 90%, ${alpha.toFixed(3)})`;
                ctx!.beginPath();
                ctx!.moveTo(p.x, p.y);
                ctx!.lineTo(q.x, q.y);
                ctx!.stroke();
              }
            }
          }
        }
      }

      /* --- 5. 卫星 + 拖尾 --- */
      if (!reduced) satellite.angle += 0.0032;
      {
        const cosT = Math.cos(satellite.tilt);
        const sinT = Math.sin(satellite.tilt);
        const ex = Math.cos(satellite.angle) * satellite.a;
        const ey = Math.sin(satellite.angle) * satellite.b;
        const sx = ex * cosT - ey * sinT;
        const sy = ex * sinT + ey * cosT;

        satellite.trail.push({ x: sx, y: sy, a: 1 });
        if (satellite.trail.length > 40) satellite.trail.shift();
        satellite.trail.forEach((p, i) => {
          p.a *= 0.945;
          const k = (i / satellite.trail.length) ** 2;
          ctx!.fillStyle = `rgba(224,242,254,${(k * 0.55).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 1.1 + k * 1.8, 0, Math.PI * 2);
          ctx!.fill();
        });

        const gr = ctx!.createRadialGradient(sx, sy, 0, sx, sy, 30);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.24, 'rgba(186,230,253,0.45)');
        gr.addColorStop(1, 'rgba(186,230,253,0)');
        ctx!.fillStyle = gr;
        ctx!.beginPath();
        ctx!.arc(sx, sy, 30, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = '#fff';
        ctx!.beginPath();
        ctx!.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx!.fill();
      }

      /* --- 6. 核心光核 --- */
      {
        const pulse = 0.92 + Math.sin(t * 1.15) * 0.08;
        const R = 110 * pulse;
        const gr = ctx!.createRadialGradient(0, 0, 0, 0, 0, R);
        gr.addColorStop(0, 'rgba(255,255,255,0.8)');
        gr.addColorStop(0.14, 'rgba(224,242,254,0.32)');
        gr.addColorStop(0.42, 'rgba(186,230,253,0.13)');
        gr.addColorStop(1, 'rgba(186,230,253,0)');
        ctx!.fillStyle = gr;
        ctx!.beginPath();
        ctx!.arc(0, 0, R, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
      ctx!.globalCompositeOperation = 'source-over';

      // 减弱动效偏好下只画一帧静态图，不再持续占用 rAF
      if (reduced) {
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    /* ------------------------------ 事件 ------------------------------ */
    const onPointerMove = (e: PointerEvent) => {
      pointer.tx = e.clientX - boxX;
      pointer.ty = e.clientY - boxY;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
      pointer.tx = -9999;
      pointer.ty = -9999;
    };
    /* 滚动只打个标记，真正的测量推迟到下一帧里做 */
    const onScroll = () => {
      boxDirty = true;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.02 }
    );

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    io.observe(wrap);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [density, interactive]);

  return (
    <div ref={wrapRef} aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      {/* .orbital-canvas：浅色主题下用 CSS 做明度翻转（见 index.css），绘制逻辑不分主题 */}
      <canvas ref={canvasRef} className="orbital-canvas h-full w-full" />
    </div>
  );
}

export default OrbitalCanvas;
