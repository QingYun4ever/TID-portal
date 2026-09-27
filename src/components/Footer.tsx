import React from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Github, Mail, MapPin } from 'lucide-react';
import { useSettings } from '@/lib/store';
import { LogoLockup } from './Brand';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: '门户',
    links: [
      { label: '首页', to: '/' },
      { label: '部门概况', to: '/about' },
      { label: '成员风采', to: '/about#members' },
    ],
  },
  {
    title: '内容',
    links: [
      { label: '通知公告', to: '/news?category=notice' },
      { label: '部门新闻', to: '/news?category=dept' },
      { label: '竞赛信息', to: '/competitions' },
      { label: '政策文件', to: '/news?category=policy' },
      { label: '活动画廊', to: '/gallery' },
    ],
  },
  {
    title: '办事',
    links: [
      { label: '活动报名', to: '/activities' },
      { label: '项目申报', to: '/projects/apply' },
      { label: '加入我们', to: '/join' },
      { label: '互动与反馈', to: '/feedback' },
    ],
  },
  {
    title: '系统',
    links: [
      { label: '用户中心', to: '/account' },
      { label: '后台管理', to: '/admin' },
    ],
  },
];

export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-white/8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(186,230,253,.35), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(186,230,253,.08), transparent 68%)' }}
      />

      <div className="shell relative py-16 lg:py-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-6">
          {/* 品牌区 */}
          <div className="col-span-2">
            <LogoLockup uid="foot" size={44} stacked={false} />
            <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              {settings.slogan || '以技术为舟，以创新为帆'}。统筹全校学生科技创新工作，为每一个想法提供从灵感到落地的支撑。
            </p>

            <div className="mt-6 flex flex-col gap-2.5 text-[12px] text-muted-foreground">
              {settings.address && (
                <span className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  {settings.address}
                </span>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2.5 transition hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  {settings.email}
                </a>
              )}
            </div>
          </div>

          {/* 链接列 */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/70">{col.title}</h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-[12px] text-muted-foreground sm:flex-row">
          <p>
            © {year} 科技创新部 · Technology &amp; Innovation Department
            {settings.icp && <span className="ml-3 opacity-70">{settings.icp}</span>}
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer noopener"
              className="transition hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
