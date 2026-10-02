import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Hash,
  Home,
  IdCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeftOpen,
  UserRound,
  UserRoundCog,
} from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { ROLES, cn } from '@/lib/utils';
import { Avatar, Button, Chip, Glass, LinkButton } from '@/components/ui';

/* =============================================================================
 * 用户中心 —— 侧栏布局
 * 结构参考后台 AdminLayout，但视觉更轻：无折叠、单一分组、强调「个人」。
 * ========================================================================== */

interface NavItem {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
  badgeKey?: 'unread';
}

const NAV: NavItem[] = [
  { to: '/account', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/account/signups', label: '我的报名', icon: BadgeCheck },
  { to: '/account/applications', label: '我的项目', icon: ClipboardList },
  { to: '/account/messages', label: '我的消息', icon: MessageSquare, badgeKey: 'unread' },
  { to: '/account/join', label: '招新进度', icon: UserRoundCog },
  { to: '/account/profile', label: '个人资料', icon: UserRound },
];

export default function AccountLayout() {
  const { user, stats, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const msg = useApi<any[]>(() => AuthApi.messages(), []);
  const unread = msg.meta?.unread ?? stats?.unread ?? 0;

  const badges = useMemo<Record<string, number>>(() => ({ unread }), [unread]);

  /* 路由变化时收起移动端抽屉、恢复滚动 */
  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (desktop.matches) setMobileNav(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileNav(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileNav]);

  const roleLabel = ROLES[user?.role ?? ''] ?? user?.role ?? '—';

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('已退出登录', '期待你下次回来。');
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error('退出失败', e?.message);
    } finally {
      setLoggingOut(false);
    }
  };

  /* ------------------------------ 侧栏身份卡 ------------------------------ */
  const IdentityCard = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn('rounded-2xl border border-white/8 bg-white/[0.04]', compact ? 'p-3.5' : 'p-4')}>
      <div className="flex items-center gap-3.5">
        <Avatar name={user?.name ?? ''} src={user?.avatar} size={compact ? 42 : 50} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{user?.name || user?.username}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="mono">@{user?.username}</span>
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Chip tone="primary" className="!px-2.5 !py-0.5">
          {roleLabel}
        </Chip>
        {user?.studentId ? (
          <Chip className="!px-2.5 !py-0.5">
            <Hash className="h-3 w-3" />
            <span className="mono">{user.studentId}</span>
          </Chip>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1.5 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="clamp-1">{user?.college || '未填写班级'}</span>
        </span>
        <span className="flex items-center gap-2">
          <IdCard className="h-3.5 w-3.5 shrink-0" />
          <span className="clamp-1">{user?.studentId || '未绑定学号'}</span>
        </span>
      </div>
    </div>
  );

  /* -------------------------------- 导航项 -------------------------------- */
  const renderItem = (it: NavItem, onNavigate?: () => void) => {
    const badge = it.badgeKey ? badges[it.badgeKey] : 0;
    return (
      <NavLink
        key={it.to}
        to={it.to}
        end={it.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300 lg:min-h-0',
            isActive
              ? 'bg-primary/[0.13] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
              : 'text-muted-foreground hover:bg-white/[0.055] hover:text-foreground'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <it.icon className="h-[17px] w-[17px] shrink-0" />
            <span className="truncate">{it.label}</span>
            {!!badge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--warning))]/18 px-1.5 text-[10px] font-semibold text-[hsl(var(--warning))]">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5">{NAV.map((it) => renderItem(it, onNavigate))}</nav>
  );

  return (
    <div className="relative min-h-dvh pt-[var(--nav-h)]">
      <div className="shell-wide py-6 pb-24">
        <div className="flex gap-6">
          {/* ---------------------------- 桌面侧栏 ---------------------------- */}
          <aside className="sticky top-[calc(var(--nav-h)+24px)] hidden h-[calc(100dvh-var(--nav-h)-48px)] w-[264px] shrink-0 flex-col lg:flex">
            <Glass tone="soft" className="flex min-h-0 flex-1 flex-col p-3.5">
              <IdentityCard />

              <div className="min-h-0 flex-1 overflow-y-auto py-3">
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                  用户中心
                </p>
                <NavList />
              </div>

              <div className="mt-1 border-t border-white/8 pt-3">
                <Link
                  to="/"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.055] hover:text-foreground"
                >
                  <Home className="h-[17px] w-[17px] shrink-0" />
                  返回门户
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-[hsl(var(--destructive))]/12 hover:text-[hsl(var(--destructive))] disabled:opacity-60"
                >
                  <LogOut className="h-[17px] w-[17px] shrink-0" />
                  {loggingOut ? '正在退出…' : '退出登录'}
                </button>
              </div>
            </Glass>
          </aside>

          {/* ----------------------------- 主区域 ----------------------------- */}
          <div className="min-w-0 flex-1" data-reveal>
            {/* 移动端：身份条 + 横向滚动 Tabs */}
            <div className="mb-5 lg:hidden">
              <Glass tone="soft" className="p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={user?.name ?? ''} src={user?.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{user?.name || user?.username}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {roleLabel}
                      {user?.studentId ? <span className="mono"> · {user.studentId}</span> : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileNav(true)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-muted-foreground transition hover:text-foreground"
                    aria-label="打开用户中心菜单"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </div>

                <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
                  {NAV.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.end}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300',
                          isActive
                            ? 'border-primary/40 bg-primary/12 text-primary'
                            : 'border-white/10 bg-white/[0.04] text-muted-foreground'
                        )
                      }
                    >
                      <it.icon className="h-3.5 w-3.5" />
                      {it.label}
                      {it.badgeKey && badges[it.badgeKey] > 0 && (
                        <span className="mono flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--warning))]/20 px-1 text-[9.5px] font-semibold text-[hsl(var(--warning))]">
                          {badges[it.badgeKey]}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </Glass>
            </div>

            <Outlet />

            <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/8 pt-6 text-center text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
              <p>
                科技创新部门户 · 用户中心 <span className="mono opacity-70">v3.0.0</span>
              </p>
              <p className="mono max-w-full break-all opacity-70">{location.pathname}</p>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------- 移动端抽屉导航 -------------------------- */}
      {mobileNav && (
        <div className="fixed inset-0 z-[88] lg:hidden">
          <div className="scrim absolute inset-0 backdrop-blur-md" onClick={() => setMobileNav(false)} />
          <div
            className="surface-drawer absolute left-0 top-0 flex h-dvh w-[min(88vw,304px)] flex-col border-r border-white/10 backdrop-blur-2xl"
            style={{ animation: 'sti-slide-left .32s cubic-bezier(.22,1,.36,1) both' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 pb-4 pl-[calc(1.25rem+env(safe-area-inset-left,0px))] pr-[calc(1.25rem+env(safe-area-inset-right,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))]">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={user?.name ?? ''} src={user?.avatar} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{user?.name}</p>
                  <p className="truncate text-[11px] text-primary">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-3 text-[11px] text-muted-foreground transition hover:bg-white/10"
              >
                关闭
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex min-h-full flex-col">
                <div className="flex-1 py-4 pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]">
              <IdentityCard compact />
              <div className="mt-4">
                <NavList onNavigate={() => setMobileNav(false)} />
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] pt-4">
              <LinkButton to="/" variant="glass" size="sm" className="min-h-11 flex-1">
                <Home className="h-3.5 w-3.5" /> 返回门户
              </LinkButton>
              <Button variant="danger" size="sm" onClick={onLogout} loading={loggingOut} className="min-h-11 flex-1">
                <LogOut className="h-3.5 w-3.5" /> 退出登录
              </Button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
