import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LogoWatermark } from './Brand';

/** 首页背景品牌轨道：滚动控制显隐，离屏或隐藏标签页时暂停 CSS 旋转。 */
export function BrandBackdrop({ className }: { className?: string }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    let height = window.innerHeight;
    let visible: boolean | undefined;
    const paint = () => {
      const next = window.scrollY >= height * 0.65;
      if (next === visible) return;
      visible = next;
      el.dataset.visible = String(next);
    };
    const resize = () => {
      height = window.innerHeight;
      paint();
    };
    const visibility = () => {
      el.dataset.paused = String(document.hidden);
    };
    paint();
    visibility();
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('scroll', paint);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return (
    <div ref={layer} aria-hidden="true" data-visible="false" data-paused="true" className={cn('brand-backdrop pointer-events-none fixed inset-0 -z-[6] overflow-hidden', className)}>
      <div className="brand-backdrop-art">
        <div className="brand-backdrop-material">
          <span className="brand-backdrop-halo" />
          <LogoWatermark />
        </div>
      </div>
    </div>
  );
}

export default BrandBackdrop;
