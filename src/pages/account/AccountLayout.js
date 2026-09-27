import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BadgeCheck, Building2, ClipboardList, Hash, Home, IdCard, LayoutDashboard, LogOut, MessageSquare, PanelLeftOpen, UserRound, UserRoundCog, } from 'lucide-react';
import { AuthApi } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { ROLES, cn } from '@/lib/utils';
import { Avatar, Button, Chip, Glass, LinkButton } from '@/components/ui';
const NAV = [
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
    const msg = useApi(() => AuthApi.messages(), []);
    const unread = msg.meta?.unread ?? stats?.unread ?? 0;
    const badges = useMemo(() => ({ unread }), [unread]);
    /* 路由变化时收起移动端抽屉、恢复滚动 */
    useEffect(() => {
        setMobileNav(false);
    }, [location.pathname]);
    useEffect(() => {
        if (!mobileNav)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => e.key === 'Escape' && setMobileNav(false);
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
        }
        catch (e) {
            toast.error('退出失败', e?.message);
        }
        finally {
            setLoggingOut(false);
        }
    };
    /* ------------------------------ 侧栏身份卡 ------------------------------ */
    const IdentityCard = ({ compact = false }) => (_jsxs("div", { className: cn('rounded-2xl border border-white/8 bg-white/[0.04]', compact ? 'p-3.5' : 'p-4'), children: [_jsxs("div", { className: "flex items-center gap-3.5", children: [_jsx(Avatar, { name: user?.name ?? '', src: user?.avatar, size: compact ? 42 : 50 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[15px] font-semibold", children: user?.name || user?.username }), _jsx("p", { className: "mt-0.5 truncate text-[11px] text-muted-foreground", children: _jsxs("span", { className: "mono", children: ["@", user?.username] }) })] })] }), _jsxs("div", { className: "mt-3.5 flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: roleLabel }), user?.studentId ? (_jsxs(Chip, { className: "!px-2.5 !py-0.5", children: [_jsx(Hash, { className: "h-3 w-3" }), _jsx("span", { className: "mono", children: user.studentId })] })) : null] }), _jsxs("div", { className: "mt-3 flex flex-col gap-1.5 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Building2, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "clamp-1", children: user?.college || '未填写学院' })] }), _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(IdCard, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "clamp-1", children: user?.studentId || '未绑定学号' })] })] })] }));
    /* -------------------------------- 导航项 -------------------------------- */
    const renderItem = (it, onNavigate) => {
        const badge = it.badgeKey ? badges[it.badgeKey] : 0;
        return (_jsx(NavLink, { to: it.to, end: it.end, onClick: onNavigate, className: ({ isActive }) => cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300', isActive
                ? 'bg-primary/[0.13] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                : 'text-muted-foreground hover:bg-white/[0.055] hover:text-foreground'), children: ({ isActive }) => (_jsxs(_Fragment, { children: [isActive && (_jsx("span", { className: "absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary" })), _jsx(it.icon, { className: "h-[17px] w-[17px] shrink-0" }), _jsx("span", { className: "truncate", children: it.label }), !!badge && (_jsx("span", { className: "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--warning))]/18 px-1.5 text-[10px] font-semibold text-[hsl(var(--warning))]", children: badge > 99 ? '99+' : badge }))] })) }, it.to));
    };
    const NavList = ({ onNavigate }) => (_jsx("nav", { className: "flex flex-col gap-0.5", children: NAV.map((it) => renderItem(it, onNavigate)) }));
    return (_jsxs("div", { className: "relative min-h-dvh pt-[68px]", children: [_jsx("div", { className: "shell-wide py-6 pb-24", children: _jsxs("div", { className: "flex gap-6", children: [_jsx("aside", { className: "sticky top-[92px] hidden h-[calc(100dvh-116px)] w-[264px] shrink-0 flex-col lg:flex", children: _jsxs(Glass, { tone: "soft", className: "flex min-h-0 flex-1 flex-col p-3.5", children: [_jsx(IdentityCard, {}), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto py-3", children: [_jsx("p", { className: "mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70", children: "\u7528\u6237\u4E2D\u5FC3" }), _jsx(NavList, {})] }), _jsxs("div", { className: "mt-1 border-t border-white/8 pt-3", children: [_jsxs(Link, { to: "/", className: "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.055] hover:text-foreground", children: [_jsx(Home, { className: "h-[17px] w-[17px] shrink-0" }), "\u8FD4\u56DE\u95E8\u6237"] }), _jsxs("button", { type: "button", onClick: onLogout, disabled: loggingOut, className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-[hsl(var(--destructive))]/12 hover:text-[hsl(var(--destructive))] disabled:opacity-60", children: [_jsx(LogOut, { className: "h-[17px] w-[17px] shrink-0" }), loggingOut ? '正在退出…' : '退出登录'] })] })] }) }), _jsxs("div", { className: "min-w-0 flex-1", "data-reveal": true, children: [_jsx("div", { className: "mb-5 lg:hidden", children: _jsxs(Glass, { tone: "soft", className: "p-3.5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: user?.name ?? '', src: user?.avatar, size: 44 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[14.5px] font-semibold", children: user?.name || user?.username }), _jsxs("p", { className: "mt-0.5 truncate text-[11px] text-muted-foreground", children: [roleLabel, user?.studentId ? _jsxs("span", { className: "mono", children: [" \u00B7 ", user.studentId] }) : null] })] }), _jsx("button", { type: "button", onClick: () => setMobileNav(true), className: "rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-muted-foreground transition hover:text-foreground", "aria-label": "\u6253\u5F00\u7528\u6237\u4E2D\u5FC3\u83DC\u5355", children: _jsx(PanelLeftOpen, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1", children: NAV.map((it) => (_jsxs(NavLink, { to: it.to, end: it.end, className: ({ isActive }) => cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300', isActive
                                                        ? 'border-primary/40 bg-primary/12 text-primary'
                                                        : 'border-white/10 bg-white/[0.04] text-muted-foreground'), children: [_jsx(it.icon, { className: "h-3.5 w-3.5" }), it.label, it.badgeKey && badges[it.badgeKey] > 0 && (_jsx("span", { className: "mono flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--warning))]/20 px-1 text-[9.5px] font-semibold text-[hsl(var(--warning))]", children: badges[it.badgeKey] }))] }, it.to))) })] }) }), _jsx(Outlet, {}), _jsxs("div", { className: "mt-10 flex flex-col items-center gap-3 border-t border-white/8 pt-6 text-center text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:text-left", children: [_jsxs("p", { children: ["\u79D1\u6280\u521B\u65B0\u90E8\u95E8\u6237 \u00B7 \u7528\u6237\u4E2D\u5FC3 ", _jsx("span", { className: "mono opacity-70", children: "v3.0.0" })] }), _jsx("p", { className: "mono opacity-70", children: location.pathname })] })] })] }) }), mobileNav && (_jsxs("div", { className: "fixed inset-0 z-[88] lg:hidden", children: [_jsx("div", { className: "absolute inset-0 bg-black/75 backdrop-blur-md", onClick: () => setMobileNav(false) }), _jsxs("div", { className: "absolute inset-y-0 left-0 flex w-[min(88vw,304px)] flex-col border-r border-white/10 bg-[#070a0f]/94 backdrop-blur-2xl", style: { animation: 'sti-slide-left .32s cubic-bezier(.22,1,.36,1) both' }, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/8 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Avatar, { name: user?.name ?? '', src: user?.avatar, size: 32 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-medium", children: user?.name }), _jsx("p", { className: "truncate text-[11px] text-primary", children: roleLabel })] })] }), _jsx("button", { type: "button", onClick: () => setMobileNav(false), className: "rounded-full px-3 py-1.5 text-[11px] text-muted-foreground transition hover:bg-white/10", children: "\u5173\u95ED" })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto p-4", children: [_jsx(IdentityCard, { compact: true }), _jsx("div", { className: "mt-4", children: _jsx(NavList, { onNavigate: () => setMobileNav(false) }) })] }), _jsxs("div", { className: "flex gap-2 border-t border-white/8 p-4", children: [_jsxs(LinkButton, { to: "/", variant: "glass", size: "sm", className: "flex-1", children: [_jsx(Home, { className: "h-3.5 w-3.5" }), " \u8FD4\u56DE\u95E8\u6237"] }), _jsxs(Button, { variant: "danger", size: "sm", onClick: onLogout, loading: loggingOut, className: "flex-1", children: [_jsx(LogOut, { className: "h-3.5 w-3.5" }), " \u9000\u51FA\u767B\u5F55"] })] })] })] }))] }));
}
