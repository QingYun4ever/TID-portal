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
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveSection, useBodyLock, useEscape, useScrollProgress } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { useMotionPresence } from '@/hooks/useMotionPresence';
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
  { icon: FileText, label: '比赛报名', desc: '提交科技比赛报名材料', to: '/projects/apply' },
  { icon: Users, label: '加入我们', desc: '查看录取名单', to: '/join' },
];

const OTHER_LINKS = [
  { icon: MessageSquare, label: '互动与反馈', desc: '留言板 · 在线咨询', to: '/feedback' },
  { icon: BookOpen, label: '科技作品库', desc: '部门与同学的科技作品', to: '/projects?category=excellent' },
  { icon: Trophy, label: '竞赛日历', desc: '竞赛截止时间一览', to: '/competitions' },
];

export function Nav() {
  const { scrolled } = useScrollProgress();
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<null | 'quick' | 'user'>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const isHome = location.pathname === '/';

  const quickPresence = useMotionPresence(openMenu === 'quick', 200);
  const userPresence = useMotionPresence(openMenu === 'user', 200);
  const mobilePresence = useMotionPresence(mobileOpen);

  useBodyLock(mobilePresence.present);
  useEscape(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, openMenu !== null || mobileOpen);

  /* 点击外部关闭 */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  /* 路由切换时收起 */
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onChange = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

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
          'fixed left-0 right-0 top-0 z-[70] transition-transform duration-200 [transition-timing-function:var(--ease-out)]',
          scrolled ? 'translate-y-[10px]' : 'translate-y-0'
        )}
      >
        <div
          className={cn(
            'border-b pt-[env(safe-area-inset-top,0px)]',
            scrolled || !isHome
              ? 'nav-glass border-white/8 shadow-[0_10px_40px_-24px_rgba(0,0,0,1)]'
              : 'border-transparent bg-transparent'
          )}
        >
          <div className="shell-wide flex h-[68px] items-center gap-2 sm:gap-4">
            {/* 品牌 */}
            <Link to="/" className="group flex shrink-0 items-center transition-opacity duration-150 hover:opacity-90" aria-label="返回首页">
              <span className={cn('origin-left transition-transform duration-200 [transition-timing-function:var(--ease-out)]', scrolled ? 'scale-90' : 'scale-100')}>
                <BrandWordmark size={36} className="gap-2 sm:gap-3.5" />
              </span>
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
                      'nav-link relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-150',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        className="nav-indicator absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                        data-active={isActive}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              {/* 深浅主题切换 */}
              <ThemeToggle />

              {/* 快速入口（文档要求的下拉菜单） */}
              <div className="hidden sm:block xl:relative">
                <DropdownTrigger
                  open={openMenu === 'quick'}
                  active={openMenu === 'quick'}
                  onClick={() => setOpenMenu(openMenu === 'quick' ? null : 'quick')}
                  label="快速入口"
                  icon={<Sparkles className="h-[15px] w-[15px]" />}
                />
                {quickPresence.present && <QuickMenu active={quickPresence.active} onClose={() => setOpenMenu(null)} />}
              </div>

              {/* 用户 */}
              {user ? (
                <div className="xl:relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                    className={cn(
                      'relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2.5 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.1] xl:min-h-0 xl:min-w-0',
                      openMenu === 'user' && 'border-white/22 bg-white/[0.11]'
                    )}
                  >
                    <Avatar name={user.name} src={user.avatar} size={28} />
                    <span className="hidden max-w-[80px] truncate text-[13px] font-medium lg:inline">{user.name}</span>
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-snow">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                  {userPresence.present && <UserMenu active={userPresence.active} onClose={() => setOpenMenu(null)} onLogout={() => void logout().catch(() => toast.error('退出登录失败', '请稍后重试'))} />}
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground xl:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobilePresence.present && <MobileMenu active={mobilePresence.active} onClose={() => setMobileOpen(false)} user={user} isAdmin={isAdmin} onLogout={() => void logout().catch(() => toast.error('退出登录失败', '请稍后重试'))} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/** 深浅主题切换：两个图标叠在一起，用旋转 + 缩放交叉淡入，纯 transform/opacity */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const light = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? '切换到深色主题' : '切换到浅色主题'}
      title={light ? '深色主题' : '浅色主题'}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-muted-foreground transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.09] hover:text-foreground xl:h-9 xl:w-9"
    >
      {/* data-keep-transition：切换主题那一帧全站过渡被关掉，这两个图标例外 */}
      <Sun
        data-keep-transition
        className={cn(
          'absolute h-[16px] w-[16px] transition-[transform,opacity] duration-200 [transition-timing-function:var(--ease-out)]',
          light ? 'rotate-0 scale-100 opacity-100' : '-rotate-45 scale-90 opacity-0'
        )}
      />
      <Moon
        data-keep-transition
        className={cn(
          'absolute h-[15px] w-[15px] transition-[transform,opacity] duration-200 [transition-timing-function:var(--ease-out)]',
          light ? 'rotate-45 scale-90 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
      />
    </button>
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
        'flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 xl:min-h-0',
        active
          ? 'border-primary/35 bg-primary/12 text-primary'
          : 'border-white/10 bg-white/[0.05] text-muted-foreground hover:border-white/20 hover:bg-white/[0.09] hover:text-foreground'
      )}
    >
      {icon}
      {label}
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150 [transition-timing-function:var(--ease-out)]', open && 'rotate-180')} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
function QuickMenu({ active, onClose }: { active: boolean; onClose: () => void }) {
  return (
    <div
      className="motion-popover absolute right-[calc(1rem+env(safe-area-inset-right,0px))] top-[calc(100%+12px)] w-[560px] max-w-[calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] origin-top-right xl:right-0"
      data-motion-open={active}
    >
      <Glass tone="strong" className="max-h-[calc(100dvh-var(--nav-h)-34px-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain p-2.5 shadow-2xl">
        <div className="grid grid-cols-2 gap-1.5">
          {[...QUICK_LINKS, ...OTHER_LINKS].map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors duration-150 hover:bg-white/[0.07]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-primary transition-colors duration-150 group-hover:border-primary/30 group-hover:bg-primary/12">
                <item.icon className="h-[15px] w-[15px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[13px] font-medium text-foreground/90">
                  {item.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-60" />
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </Glass>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function UserMenu({ active, onClose, onLogout }: { active: boolean; onClose: () => void; onLogout: () => void }) {
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
      className="motion-popover absolute right-[calc(1rem+env(safe-area-inset-right,0px))] top-[calc(100%+12px)] w-[268px] max-w-[calc(100vw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] origin-top-right xl:right-0"
      data-motion-open={active}
    >
      <Glass tone="strong" className="max-h-[calc(100dvh-var(--nav-h)-34px-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain p-2 shadow-2xl">
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
              className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-primary transition-colors duration-150 hover:bg-primary/10 xl:min-h-0"
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
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-white/[0.07] hover:text-[hsl(var(--destructive))] xl:min-h-0"
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
      className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-foreground/80 transition-colors duration-150 hover:bg-white/[0.07] hover:text-foreground xl:min-h-0"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      {!!badge && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-snow">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
function MobileMenu({
  active,
  onClose,
  user,
  isAdmin,
  onLogout,
}: {
  active: boolean;
  onClose: () => void;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] xl:hidden">
      <div className="motion-backdrop scrim absolute inset-0 backdrop-blur-md" data-motion-open={active} onClick={onClose} />
      <div
        className="motion-drawer surface-drawer absolute right-0 top-0 flex h-dvh w-[min(90vw,380px)] flex-col border-l border-white/10 backdrop-blur-2xl"
        data-side="right"
        data-motion-open={active}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 pb-4 pl-[calc(1.25rem+env(safe-area-inset-left,0px))] pr-[calc(1.25rem+env(safe-area-inset-right,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))]">
          <BrandWordmark size={30} />
          <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-white/10" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col">
            <div className="flex-1 py-4 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]">
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-150',
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
              <Link key={it.to} to={it.to} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition-colors duration-150 hover:bg-white/[0.06]">
                <it.icon className="h-4 w-4 text-primary" />
                {it.label}
              </Link>
            ))}
          </div>

          <p className="mb-2 mt-6 px-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">其他链接</p>
          <div className="flex flex-col gap-0.5">
            {OTHER_LINKS.map((it) => (
              <Link key={it.to} to={it.to} className="flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition-colors duration-150 hover:bg-white/[0.06]">
                <it.icon className="h-4 w-4 text-muted-foreground" />
                {it.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] pt-4">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.045] px-4 py-3">
                <Avatar name={user.name} src={user.avatar} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="mono truncate text-[11px] text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LinkButton to="/account" size="sm" variant="glass" className="min-h-11 w-full">
                  用户中心
                </LinkButton>
                {isAdmin && (
                  <LinkButton to="/admin" size="sm" variant="primary" className="min-h-11 w-full">
                    后台管理
                  </LinkButton>
                )}
                <Button size="sm" variant="glass" className={cn('min-h-11', isAdmin ? 'col-span-2' : 'w-full')} onClick={() => { onLogout(); onClose(); }}>
                  退出登录
                </Button>
              </div>
            </div>
          ) : (
            <LinkButton to="/login" size="sm" variant="primary" className="min-h-11 w-full">
              登录
            </LinkButton>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

