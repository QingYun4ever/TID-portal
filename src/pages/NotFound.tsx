import { Link, useLocation } from 'react-router';
import { Compass, Home as HomeIcon } from 'lucide-react';
import { LogoMark } from '@/components/Brand';
import { Glass, LinkButton } from '@/components/ui';

const LINKS = [
  { to: '/', label: '首页' },
  { to: '/news', label: '新闻与通知' },
  { to: '/activities', label: '活动报名' },
  { to: '/projects', label: '创新项目' },
  { to: '/gallery', label: '活动画廊' },
  { to: '/join', label: '加入我们' },
];

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-32">
      <Glass tone="strong" className="relative w-full max-w-lg overflow-hidden p-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(224,242,254,.14), transparent 66%)' }}
        />
        <div className="relative">
          <LogoMark uid="nf" animated className="mx-auto h-24 w-24" />
          <p className="mono mt-7 text-[11px] uppercase tracking-[0.34em] text-muted-foreground">Error 404</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            <span className="spotlight-text">页面走丢了</span>
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
            没有找到你要访问的页面。可能是链接已失效，或者地址输入有误。
          </p>
          <p className="mono mt-3 truncate rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] text-muted-foreground">
            {location.pathname}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to="/" variant="primary">
              <HomeIcon className="h-4 w-4" />
              返回首页
            </LinkButton>
          </div>

          <div className="hairline my-8" />

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[12px]">
            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-muted-foreground transition hover:text-primary">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </Glass>
    </div>
  );
}
