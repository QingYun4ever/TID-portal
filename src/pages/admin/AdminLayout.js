import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Activity, BookOpen, ChevronLeft, ClipboardList, Download, FileText, GitBranch, Home, Image as ImageIcon, LayoutDashboard, Layers, MessageSquare, PanelLeftClose, PanelLeftOpen, ScrollText, Settings, ShieldCheck, Sparkles, Trophy, UserCheck, Users, } from 'lucide-react';
import { cn, ROLES } from '@/lib/utils';
import { useAuth } from '@/lib/store';
import { Avatar, Button, Chip, Glass, LinkButton } from '@/components/ui';
const GROUPS = [
    {
        title: '概览',
        items: [{ to: '/admin', label: '数据看板', icon: LayoutDashboard }],
    },
    {
        title: '内容管理',
        items: [
            { to: '/admin/articles', label: '新闻与通知', icon: FileText },
            { to: '/admin/activities', label: '活动管理', icon: Activity },
            { to: '/admin/projects', label: '项目展示库', icon: Layers },
            { to: '/admin/competitions', label: '竞赛信息', icon: Trophy },
            { to: '/admin/resources', label: '资源中心', icon: Download },
        ],
    },
    {
        title: '业务办理',
        items: [
            { to: '/admin/signups', label: '活动报名', icon: UserCheck, badgeKey: 'signups' },
            { to: '/admin/applications', label: '项目申报', icon: ClipboardList, badgeKey: 'applicationsPending' },
            { to: '/admin/join', label: '招新报名', icon: Users, badgeKey: 'joinPending' },
            { to: '/admin/feedback', label: '留言反馈', icon: MessageSquare, badgeKey: 'feedbackOpen' },
        ],
    },
    {
        title: '站点建设',
        items: [
            { to: '/admin/gallery', label: '活动画廊', icon: ImageIcon },
            { to: '/admin/members', label: '成员与架构', icon: Users },
            { to: '/admin/about', label: '部门概况页', icon: BookOpen },
            { to: '/admin/changelog', label: '更新日志', icon: GitBranch },
        ],
    },
    {
        title: '系统',
        items: [
            { to: '/admin/users', label: '用户与权限', icon: ShieldCheck, superOnly: true },
            { to: '/admin/settings', label: '站点设置', icon: Settings },
            { to: '/admin/logs', label: '操作日志与备份', icon: ScrollText },
        ],
    },
];
export default function AdminLayout() {
    const { user, isSuperAdmin, stats } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNav, setMobileNav] = useState(false);
    const badges = useMemo(() => ({
        applicationsPending: stats?.applicationsPending ?? 0,
        joinPending: stats?.joinPending ?? 0,
        feedbackOpen: stats?.feedbackOpen ?? 0,
    }), [stats]);
    const groups = useMemo(() => GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly || isSuperAdmin) })), [isSuperAdmin]);
    const NavList = ({ onNavigate }) => (_jsx("nav", { className: "flex flex-col gap-6", children: groups.map((g) => (_jsxs("div", { children: [!collapsed && (_jsx("p", { className: "mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70", children: g.title })), _jsx("div", { className: "flex flex-col gap-0.5", children: g.items.map((it) => {
                        const badge = it.badgeKey ? badges[it.badgeKey] : 0;
                        return (_jsx(NavLink, { to: it.to, end: it.to === '/admin', onClick: onNavigate, title: collapsed ? it.label : undefined, className: ({ isActive }) => cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300', isActive
                                ? 'bg-primary/[0.13] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                                : 'text-muted-foreground hover:bg-white/[0.055] hover:text-foreground'), children: ({ isActive }) => (_jsxs(_Fragment, { children: [isActive && (_jsx("span", { className: "absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary" })), _jsx(it.icon, { className: "h-[17px] w-[17px] shrink-0" }), !collapsed && _jsx("span", { className: "truncate", children: it.label }), !collapsed && !!badge && (_jsx("span", { className: "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--warning))]/18 px-1.5 text-[10px] font-semibold text-[hsl(var(--warning))]", children: badge }))] })) }, it.to));
                    }) })] }, g.title))) }));
    return (_jsxs("div", { className: "relative min-h-dvh pt-[68px]", children: [_jsx("div", { className: "shell-wide py-6", children: _jsxs("div", { className: "flex gap-6", children: [_jsx("aside", { className: cn('sticky top-[92px] hidden h-[calc(100dvh-116px)] shrink-0 flex-col transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)] lg:flex', collapsed ? 'w-[76px]' : 'w-[248px]'), children: _jsxs(Glass, { tone: "soft", className: "flex min-h-0 flex-1 flex-col p-3", children: [_jsxs("div", { className: cn('mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3', collapsed && 'justify-center px-1'), children: [_jsx(Avatar, { name: user?.name ?? '', src: user?.avatar, size: collapsed ? 32 : 38 }), !collapsed && (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-medium", children: user?.name }), _jsx("p", { className: "mt-0.5 truncate text-[11px] text-primary", children: ROLES[user?.role ?? ''] ?? user?.role })] }))] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto pr-0.5", children: _jsx(NavList, {}) }), _jsxs("div", { className: "mt-3 border-t border-white/8 pt-3", children: [_jsxs(Link, { to: "/", className: cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.055] hover:text-foreground', collapsed && 'justify-center px-1'), children: [_jsx(Home, { className: "h-[17px] w-[17px] shrink-0" }), !collapsed && '返回门户'] }), _jsxs("button", { onClick: () => setCollapsed((c) => !c), className: cn('mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.055] hover:text-foreground', collapsed && 'justify-center px-1'), children: [collapsed ? _jsx(PanelLeftOpen, { className: "h-[17px] w-[17px] shrink-0" }) : _jsx(PanelLeftClose, { className: "h-[17px] w-[17px] shrink-0" }), !collapsed && '收起侧栏'] })] })] }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3 lg:hidden", children: [_jsxs(Button, { variant: "glass", size: "sm", onClick: () => setMobileNav(true), children: [_jsx(PanelLeftOpen, { className: "h-4 w-4" }), "\u83DC\u5355"] }), _jsxs(Chip, { tone: "primary", children: [_jsx(Sparkles, { className: "h-3 w-3" }), "\u540E\u53F0\u7BA1\u7406"] })] }), _jsx(Outlet, {}), _jsxs("div", { className: "mt-10 flex flex-col items-center gap-3 border-t border-white/8 pt-6 text-center text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:text-left", children: [_jsxs("p", { children: ["\u79D1\u6280\u521B\u65B0\u90E8\u95E8\u6237 \u00B7 \u540E\u53F0\u7BA1\u7406\u7CFB\u7EDF ", _jsx("span", { className: "mono opacity-70", children: "v3.0.0" })] }), _jsx("p", { className: "mono opacity-70", children: location.pathname })] })] })] }) }), mobileNav && (_jsxs("div", { className: "fixed inset-0 z-[88] lg:hidden", children: [_jsx("div", { className: "absolute inset-0 bg-black/75 backdrop-blur-md", onClick: () => setMobileNav(false) }), _jsxs("div", { className: "absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col border-r border-white/10 bg-[#070a0f]/94 backdrop-blur-2xl", style: { animation: 'sti-slide-left .32s cubic-bezier(.22,1,.36,1) both' }, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/8 px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Avatar, { name: user?.name ?? '', size: 32 }), _jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-medium", children: user?.name }), _jsx("p", { className: "text-[11px] text-primary", children: ROLES[user?.role ?? ''] })] })] }), _jsx("button", { onClick: () => setMobileNav(false), className: "rounded-full p-2 text-muted-foreground hover:bg-white/10", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-4", children: _jsx(NavList, { onNavigate: () => setMobileNav(false) }) }), _jsx("div", { className: "border-t border-white/8 p-4", children: _jsxs(LinkButton, { to: "/", variant: "glass", size: "sm", className: "w-full", children: [_jsx(Home, { className: "h-3.5 w-3.5" }), " \u8FD4\u56DE\u95E8\u6237"] }) })] })] }))] }));
}
