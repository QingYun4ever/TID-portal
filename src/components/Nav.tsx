import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  FileText,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Sparkles,
  Trophy,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveSection, useBodyLock, useScrollProgress } from '@/lib/hooks';
import { useAuth, useSettings } from '@/lib/store';
import { BrandWordmark } from './Brand';
import { Avatar, Button, Dot, Glass, LinkButton } from './ui';
import { AuthApi } from '@/lib/api';

/* =============================================================================
 * 主导航
 * ========================================================================== */

const MAIN_NAV = [
  { label: '首页', to: '/' },
  { label: '部门概况', to: '/about' },
  { label: '新闻通知', to: '/news' },
  { label: '活动', to: '/activities' },
  { label: '竞赛与项目', to: '/projects' },
  { label: '画廊', to: '/gallery' },
  { label: '加入我们', to: '/join' },
];

/** 顶栏「快速入口」下拉 */
const QUICK_LINKS = [
  { icon: CalendarDays, label: '活动报名', desc: '查看活动并在线报名', to: '/activities' },
  { icon: FileText, label: '项目申报', desc: '提交大创项目申报材料', to: '/projects/apply' },
  { icon: Users, label: '加入我们', desc: '查看录取名单', to: '/join' },
];

const OTHER_LINKS = [
  { icon: MessageSquare, label: '互动与反馈', desc: '留言板 · 在线咨询', to: '/feedback' },
  { icon: BookOpen, label: '创新成果库', desc: '优秀项目与获奖成果', to: '/projects?category=excellent' },
  { icon: Trophy, label: '竞赛日历', desc: '竞赛截止时间一览', to: '/competitions' },
  { icon: Layers, label: '全景搜索', desc: '全站内容检索', to: '/search' },
];

export function Nav() {
  const { scrolled } = useScrollProgress();
  const { user, isAdmin, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<null | 'quick' | 'user'>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const isHome = location.pathname === '/';

  useBodyLock(mobileOpen);

  /* 点击外部关闭 */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /* 路由切换时收起 */
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  /* 未读消息 */
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    AuthApi.messages()
      .then((r) => setUnread(r?.unread ?? 0))
      .catch(() => {});
  }, [user, location.pathname]);

  const onScrollTop = !scrolled && isHome;

  return (
    <>
      <header
        ref={navRef}
        className={cn(
          'fixed left-0 right-0 top-0 z-[70] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]',
          scrolled ? 'py-2.5' : 'py-0'
        )}
      >
        <div
          className={cn(
            'border-b transition-all duration-500',
            scrolled || !isHome
              ? 'nav-glass border-white/8 shadow-[0_10px_40px_-24px_rgba(0,0,0,1)]'
              : 'border-transparent bg-transparent'
          )}
        >
          <div className="shell-wide flex h-[68px] items-center gap-4">
            {/* 品牌 */}
            <Link to="/" className="group flex shrink-0 items-center transition-opacity hover:opacity-90" aria-label="返回首页">
              <BrandWordmark size={scrolled ? 32 : 36} />
            </Link>

            {/* 主导航 */}
            <nav className="ml-4 hidden items-center gap-0.5 xl:flex">
              {MAIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-300',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5">
              {/* 搜索 */}
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                aria-label="搜索"
              >
                <Search className="h-[17px] w-[17px]" />
              </button>

              {/* 快速入口（文档要求的下拉菜单） */}
              <div className="relative hidden sm:block">
                <DropdownTrigger
                  open={openMenu === 'quick'}
                  active={openMenu === 'quick'}
                  onClick={() => setOpenMenu(openMenu === 'quick' ? null : 'quick')}
                  label="快速入口"
                  icon={<Sparkles className="h-[15px] w-[15px]" />}
                />
                {openMenu === 'quick' && <QuickMenu onClose={() => setOpenMenu(null)} />}
              </div>

              {/* 用户 */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                    className={cn(
                      'relative flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2.5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]',
                      openMenu === 'user' && 'border-white/22 bg-white/[0.11]'
                    )}
                  >
                    <Avatar name={user.name} src={user.avatar} size={28} />
                    <span className="hidden max-w-[80px] truncate text-[13px] font-medium lg:inline">{user.name}</span>
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                  {openMenu === 'user' && <UserMenu onClose={() => setOpenMenu(null)} onLogout={logout} />}
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => (window.location.href = '/login')}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  登录
                </Button>
              )}

              {/* 移动端菜单 */}
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-full p-2.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground xl:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} user={user} isAdmin={isAdmin} onLogout={logout} />}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
function DropdownTrigger({
  open,
  active,
  onClick,
  label,
  icon,
}: {
  open: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-300',
        active
          ? 'border-primary/35 bg-primary/12 text-primary'
          : 'border-white/10 bg-white/[0.05] text-muted-foreground hover:border-white/20 hover:bg-white/[0.09] hover:text-foreground'
      )}
    >
      {icon}
      {label}
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180')} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
function QuickMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute right-0 top-[calc(100%+12px)] w-[560px] origin-top-right"
      style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
    >
      <Glass tone="strong" className="p-2.5 shadow-2xl">
        <div className="grid grid-cols-2 gap-1.5">
          {[...QUICK_LINKS, ...OTHER_LINKS].map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-all duration-300 hover:bg-white/[0.07]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-primary transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/12">
                <item.icon className="h-[15px] w-[15px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[13px] font-medium text-foreground/90">
                  {item.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:opacity-60" />
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="hairline my-2" />
        <div className="flex items-center justify-between px-3.5 py-1.5">
          <span className="text-[11px] text-muted-foreground">找不到需要的入口？</span>
          <Link
            to="/search"
            onClick={onClose}
            className="text-[11px] font-medium text-primary transition hover:underline"
          >
            全站搜索 →
          </Link>
        </div>
      </Glass>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function UserMenu({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const { user, isAdmin, stats } = useAuth();
  if (!user) return null;
  const items = [
    { icon: UserIcon, label: '用户中心', to: '/account' },
    { icon: CalendarDays, label: '我的报名', to: '/account/signups' },
    { icon: FileText, label: '我的项目', to: '/account/applications' },
    { icon: Bell, label: '我的消息', to: '/account/messages', badge: stats?.unread },
    { icon: Briefcase, label: '招新进度', to: '/account/join' },
  ];
  return (
    <div
      className="absolute right-0 top-[calc(100%+12px)] w-[268px] origin-top-right"
      style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
    >
      <Glass tone="strong" className="p-2 shadow-2xl">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <Avatar name={user.name} src={user.avatar} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="mono mt-0.5 truncate text-[11px] text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <div className="hairline mx-2 my-1.5" />
        <div className="flex flex-col gap-0.5">
          {items.map((it) => (
            <NavItem key={it.to} {...it} onClick={onClose} />
          ))}
        </div>
        {isAdmin && (
          <>
            <div className="hairline mx-2 my-1.5" />
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-primary transition hover:bg-primary/10"
            >
              <LayoutDashboard className="h-4 w-4" />
              后台管理
              <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
            </Link>
          </>
        )}
        <div className="hairline mx-2 my-1.5" />
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.07] hover:text-[hsl(var(--destructive))]"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </Glass>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  to,
  badge,
  onClick,
}: {
  icon: any;
  label: string;
  to: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.07] hover:text-foreground"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      {!!badge && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
function MobileMenu({
  onClose,
  user,
  isAdmin,
  onLogout,
}: {
  onClose: () => void;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] xl:hidden">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} style={{ animation: 'sti-fade .25s ease both' }} />
      <div
        className="absolute inset-y-0 right-0 flex w-[min(90vw,380px)] flex-col border-l border-white/10 bg-[#070a0f]/92 backdrop-blur-2xl"
        style={{ animation: 'sti-slide-right .35s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <BrandWordmark size={30} />
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-2xl px-4 py-3 text-sm font-medium transition',
                    isActive ? 'bg-white/[0.09] text-foreground' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
                  )
                }
              >
                {it.label}
              </NavLink>
            ))}
          </div>

          <p className="mb-2 mt-6 px-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">快速入口</p>
          <div className="flex flex-col gap-0.5">
            {QUICK_LINKS.map((it) => (
              <Link key={it.to} to={it.to} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.06]">
                <it.icon className="h-4 w-4 text-primary" />
                {it.label}
              </Link>
            ))}
          </div>

          <p className="mb-2 mt-6 px-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">其他链接</p>
          <div className="flex flex-col gap-0.5">
            {OTHER_LINKS.map((it) => (
              <Link key={it.to} to={it.to} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.06]">
                <it.icon className="h-4 w-4 text-muted-foreground" />
                {it.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/8 p-4">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.045] px-4 py-3">
                <Avatar name={user.name} src={user.avatar} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="mono text-[11px] text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LinkButton to="/account" size="sm" variant="glass" className="w-full">
                  用户中心
                </LinkButton>
                {isAdmin ? (
                  <LinkButton to="/admin" size="sm" variant="primary" className="w-full">
                    后台管理
                  </LinkButton>
                ) : (
                  <Button size="sm" variant="glass" onClick={() => { onLogout(); onClose(); }}>
                    退出登录
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <LinkButton to="/login" size="sm" variant="glass" className="w-full">
                登录
              </LinkButton>
              <LinkButton to="/register" size="sm" variant="primary" className="w-full">
                注册
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useBodyLock(true);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const go = () => {
    if (!q.trim()) return;
    window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
  };

  const hints = ['大创项目', '挑战杯', '电子设计竞赛', '创新工坊', '学分认定'];

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} style={{ animation: 'sti-fade .22s ease both' }} />
      <div className="shell relative pt-[16vh]" style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}>
        <Glass tone="strong" className="mx-auto max-w-2xl p-2">
          <div className="flex items-center gap-3 px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="搜索新闻、活动、项目、竞赛、资源…"
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="mono hidden shrink-0 rounded-md border border-white/12 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>
        </Glass>
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] text-muted-foreground">热门搜索</span>
          {hints.map((h) => (
            <button
              key={h}
              onClick={() => setQ(h)}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] text-muted-foreground transition hover:border-white/22 hover:text-foreground"
            >
              {h}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-6 flex max-w-2xl justify-center">
          <Button variant="primary" onClick={go} disabled={!q.trim()}>
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
