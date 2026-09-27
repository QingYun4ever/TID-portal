import React from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, GitBranch, Github, Mail, MapPin, Phone, QrCode } from 'lucide-react';
import { useSettings } from '@/lib/store';
import { LogoLockup } from './Brand';
import { Glass } from './ui';

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: '门户',
    links: [
      { label: '首页', to: '/' },
      { label: '部门概况', to: '/about' },
      { label: '组织架构', to: '/about#org' },
      { label: '成员风采', to: '/about#members' },
      { label: '联系方式', to: '/about#contact' },
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
      { label: '资源下载', to: '/resources' },
      { label: '加入我们', to: '/join' },
      { label: '互动与反馈', to: '/feedback' },
    ],
  },
  {
    title: '系统',
    links: [
      { label: '更新日志', to: '/changelog' },
      { label: '全站搜索', to: '/search' },
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
              {settings.phone && (
                <span className="mono flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  {settings.phone}
                </span>
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

        {/* 微信二维码 */}
        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_auto]">
          <Glass tone="soft" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="mono rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[10px] tracking-[0.14em] text-foreground/70">
                  v3.0.0
                </span>
                <span className="text-[13px] font-medium">门户持续迭代中</span>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                功能调整、界面改版与问题修复都会记录在{' '}
                <Link to="/changelog" className="text-primary transition hover:underline">
                  更新日志
                </Link>
                ；有建议请到{' '}
                <Link to="/feedback" className="text-primary transition hover:underline">
                  互动与反馈
                </Link>
                。
              </p>
            </div>
            <Link
              to="/changelog"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-[12px] font-medium text-foreground/85 transition hover:border-white/25 hover:bg-white/[0.09]"
            >
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              查看更新日志
            </Link>
          </Glass>

          <Glass tone="soft" className="flex items-center gap-5 p-6">
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05]">
              {settings.wechatQr ? (
                <img src={settings.wechatQr} alt="微信公众号二维码" className="h-full w-full object-cover" />
              ) : (
                <QrCode className="h-9 w-9 text-muted-foreground/60" />
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium">关注公众号</p>
              <p className="mt-1.5 max-w-[180px] text-[12px] leading-relaxed text-muted-foreground">
                扫码获取竞赛提醒、活动预告与政策解读
              </p>
            </div>
          </Glass>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-[12px] text-muted-foreground sm:flex-row">
          <p>
            © {year} 科技创新部 · Technology &amp; Innovation Department
            {settings.icp && <span className="ml-3 opacity-70">{settings.icp}</span>}
          </p>
          <div className="flex items-center gap-5">
            <span className="mono opacity-70">Portal v3.0.0</span>
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
