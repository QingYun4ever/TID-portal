import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ArrowUpRight, Bell, BookOpen, Briefcase, CalendarDays, ChevronDown, Download, FileText, GitBranch, Layers, LayoutDashboard, LogIn, LogOut, Menu, MessageSquare, Search, Sparkles, Trophy, User as UserIcon, Users, X, } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBodyLock, useScrollProgress } from '@/lib/hooks';
import { useAuth, useSettings } from '@/lib/store';
import { BrandWordmark } from './Brand';
import { Avatar, Button, Glass, LinkButton } from './ui';
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
    { label: '资源中心', to: '/resources' },
    { label: '画廊', to: '/gallery' },
    { label: '加入我们', to: '/join' },
];
/** 顶栏「快速入口」下拉 —— 文档指定项：活动报名、项目申报、资源下载、加入我们、其他链接、更新日志 */
const QUICK_LINKS = [
    { icon: CalendarDays, label: '活动报名', desc: '查看活动并在线报名', to: '/activities' },
    { icon: FileText, label: '项目申报', desc: '提交大创项目申报材料', to: '/projects/apply' },
    { icon: Download, label: '资源下载', desc: '模板、指南与培训资料', to: '/resources' },
    { icon: Users, label: '加入我们', desc: '招新公告与岗位介绍', to: '/join' },
];
const OTHER_LINKS = [
    { icon: MessageSquare, label: '互动与反馈', desc: '留言板 · 在线咨询', to: '/feedback' },
    { icon: GitBranch, label: '更新日志', desc: '门户版本变更记录', to: '/changelog' },
    { icon: BookOpen, label: '创新成果库', desc: '优秀项目与获奖成果', to: '/projects?category=excellent' },
    { icon: Trophy, label: '竞赛日历', desc: '竞赛截止时间一览', to: '/competitions' },
    { icon: Layers, label: '全景搜索', desc: '全站内容检索', to: '/search' },
];
export function Nav() {
    const { scrolled } = useScrollProgress();
    const { user, isAdmin, logout } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const navRef = useRef(null);
    const isHome = location.pathname === '/';
    useBodyLock(mobileOpen);
    /* 点击外部关闭 */
    useEffect(() => {
        const onDown = (e) => {
            if (!navRef.current?.contains(e.target))
                setOpenMenu(null);
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
            .catch(() => { });
    }, [user, location.pathname]);
    const onScrollTop = !scrolled && isHome;
    return (_jsxs(_Fragment, { children: [_jsx("header", { ref: navRef, className: cn('fixed left-0 right-0 top-0 z-[70] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]', scrolled ? 'py-2.5' : 'py-0'), children: _jsx("div", { className: cn('border-b transition-all duration-500', scrolled || !isHome
                        ? 'nav-glass border-white/8 shadow-[0_10px_40px_-24px_rgba(0,0,0,1)]'
                        : 'border-transparent bg-transparent'), children: _jsxs("div", { className: "shell-wide flex h-[68px] items-center gap-4", children: [_jsx(Link, { to: "/", className: "group flex shrink-0 items-center transition-opacity hover:opacity-90", "aria-label": "\u8FD4\u56DE\u9996\u9875", children: _jsx(BrandWordmark, { size: scrolled ? 32 : 36 }) }), _jsx("nav", { className: "ml-4 hidden items-center gap-0.5 xl:flex", children: MAIN_NAV.map((item) => (_jsx(NavLink, { to: item.to, end: item.to === '/', className: ({ isActive }) => cn('relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-300', isActive
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'), children: ({ isActive }) => (_jsxs(_Fragment, { children: [item.label, isActive && (_jsx("span", { className: "absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent" }))] })) }, item.to))) }), _jsxs("div", { className: "ml-auto flex items-center gap-1.5", children: [_jsx("button", { onClick: () => setSearchOpen(true), className: "rounded-full p-2.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground", "aria-label": "\u641C\u7D22", children: _jsx(Search, { className: "h-[17px] w-[17px]" }) }), _jsxs("div", { className: "relative hidden sm:block", children: [_jsx(DropdownTrigger, { open: openMenu === 'quick', active: openMenu === 'quick', onClick: () => setOpenMenu(openMenu === 'quick' ? null : 'quick'), label: "\u5FEB\u901F\u5165\u53E3", icon: _jsx(Sparkles, { className: "h-[15px] w-[15px]" }) }), openMenu === 'quick' && _jsx(QuickMenu, { onClose: () => setOpenMenu(null) })] }), user ? (_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setOpenMenu(openMenu === 'user' ? null : 'user'), className: cn('relative flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-2.5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]', openMenu === 'user' && 'border-white/22 bg-white/[0.11]'), children: [_jsx(Avatar, { name: user.name, src: user.avatar, size: 28 }), _jsx("span", { className: "hidden max-w-[80px] truncate text-[13px] font-medium lg:inline", children: user.name }), unread > 0 && (_jsx("span", { className: "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-white", children: unread > 9 ? '9+' : unread }))] }), openMenu === 'user' && _jsx(UserMenu, { onClose: () => setOpenMenu(null), onLogout: logout })] })) : (_jsxs(Button, { variant: "primary", size: "sm", className: "hidden sm:inline-flex", onClick: () => (window.location.href = '/login'), children: [_jsx(LogIn, { className: "h-3.5 w-3.5" }), "\u767B\u5F55"] })), _jsx("button", { onClick: () => setMobileOpen(true), className: "rounded-full p-2.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground xl:hidden", "aria-label": "\u6253\u5F00\u83DC\u5355", children: _jsx(Menu, { className: "h-5 w-5" }) })] })] }) }) }), mobileOpen && _jsx(MobileMenu, { onClose: () => setMobileOpen(false), user: user, isAdmin: isAdmin, onLogout: logout }), searchOpen && _jsx(SearchOverlay, { onClose: () => setSearchOpen(false) })] }));
}
/* -------------------------------------------------------------------------- */
function DropdownTrigger({ open, active, onClick, label, icon, }) {
    return (_jsxs("button", { onClick: onClick, "aria-expanded": open, className: cn('flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-300', active
            ? 'border-primary/35 bg-primary/12 text-primary'
            : 'border-white/10 bg-white/[0.05] text-muted-foreground hover:border-white/20 hover:bg-white/[0.09] hover:text-foreground'), children: [icon, label, _jsx(ChevronDown, { className: cn('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180') })] }));
}
/* -------------------------------------------------------------------------- */
function QuickMenu({ onClose }) {
    return (_jsx("div", { className: "absolute right-0 top-[calc(100%+12px)] w-[560px] origin-top-right", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, children: _jsxs(Glass, { tone: "strong", className: "p-2.5 shadow-2xl", children: [_jsx("div", { className: "grid grid-cols-2 gap-1.5", children: [...QUICK_LINKS, ...OTHER_LINKS].map((item) => (_jsxs(Link, { to: item.to, onClick: onClose, className: "group flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-all duration-300 hover:bg-white/[0.07]", children: [_jsx("span", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-primary transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/12", children: _jsx(item.icon, { className: "h-[15px] w-[15px]" }) }), _jsxs("span", { className: "min-w-0", children: [_jsxs("span", { className: "flex items-center gap-1 text-[13px] font-medium text-foreground/90", children: [item.label, _jsx(ArrowUpRight, { className: "h-3 w-3 opacity-0 transition-all duration-300 group-hover:opacity-60" })] }), _jsx("span", { className: "mt-0.5 block truncate text-[11px] text-muted-foreground", children: item.desc })] })] }, item.to + item.label))) }), _jsx("div", { className: "hairline my-2" }), _jsxs("div", { className: "flex items-center justify-between px-3.5 py-1.5", children: [_jsx("span", { className: "text-[11px] text-muted-foreground", children: "\u627E\u4E0D\u5230\u9700\u8981\u7684\u5165\u53E3\uFF1F" }), _jsx(Link, { to: "/search", onClick: onClose, className: "text-[11px] font-medium text-primary transition hover:underline", children: "\u5168\u7AD9\u641C\u7D22 \u2192" })] })] }) }));
}
/* -------------------------------------------------------------------------- */
function UserMenu({ onClose, onLogout }) {
    const { user, isAdmin, stats } = useAuth();
    if (!user)
        return null;
    const items = [
        { icon: UserIcon, label: '用户中心', to: '/account' },
        { icon: CalendarDays, label: '我的报名', to: '/account/signups' },
        { icon: FileText, label: '我的项目', to: '/account/applications' },
        { icon: Bell, label: '我的消息', to: '/account/messages', badge: stats?.unread },
        { icon: Briefcase, label: '招新进度', to: '/account/join' },
    ];
    return (_jsx("div", { className: "absolute right-0 top-[calc(100%+12px)] w-[268px] origin-top-right", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, children: _jsxs(Glass, { tone: "strong", className: "p-2 shadow-2xl", children: [_jsxs("div", { className: "flex items-center gap-3 px-3.5 py-3", children: [_jsx(Avatar, { name: user.name, src: user.avatar, size: 40 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium", children: user.name }), _jsxs("p", { className: "mono mt-0.5 truncate text-[11px] text-muted-foreground", children: ["@", user.username] })] })] }), _jsx("div", { className: "hairline mx-2 my-1.5" }), _jsx("div", { className: "flex flex-col gap-0.5", children: items.map((it) => (_jsx(NavItem, { ...it, onClick: onClose }, it.to))) }), isAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { className: "hairline mx-2 my-1.5" }), _jsxs(Link, { to: "/admin", onClick: onClose, className: "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-primary transition hover:bg-primary/10", children: [_jsx(LayoutDashboard, { className: "h-4 w-4" }), "\u540E\u53F0\u7BA1\u7406", _jsx(ArrowUpRight, { className: "ml-auto h-3.5 w-3.5" })] })] })), _jsx("div", { className: "hairline mx-2 my-1.5" }), _jsxs("button", { onClick: () => {
                        onLogout();
                        onClose();
                    }, className: "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-muted-foreground transition hover:bg-white/[0.07] hover:text-[hsl(var(--destructive))]", children: [_jsx(LogOut, { className: "h-4 w-4" }), "\u9000\u51FA\u767B\u5F55"] })] }) }));
}
function NavItem({ icon: Icon, label, to, badge, onClick, }) {
    return (_jsxs(Link, { to: to, onClick: onClick, className: "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.07] hover:text-foreground", children: [_jsx(Icon, { className: "h-4 w-4 text-muted-foreground" }), label, !!badge && (_jsx("span", { className: "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[9px] font-bold text-white", children: badge > 9 ? '9+' : badge }))] }));
}
/* -------------------------------------------------------------------------- */
function MobileMenu({ onClose, user, isAdmin, onLogout, }) {
    return (_jsxs("div", { className: "fixed inset-0 z-[85] xl:hidden", children: [_jsx("div", { className: "absolute inset-0 bg-black/75 backdrop-blur-md", onClick: onClose, style: { animation: 'sti-fade .25s ease both' } }), _jsxs("div", { className: "absolute inset-y-0 right-0 flex w-[min(90vw,380px)] flex-col border-l border-white/10 bg-[#070a0f]/92 backdrop-blur-2xl", style: { animation: 'sti-slide-right .35s cubic-bezier(.22,1,.36,1) both' }, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/8 px-5 py-4", children: [_jsx(BrandWordmark, { size: 30 }), _jsx("button", { onClick: onClose, className: "rounded-full p-2 text-muted-foreground transition hover:bg-white/10", "aria-label": "\u5173\u95ED", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto px-4 py-4", children: [_jsx("div", { className: "flex flex-col gap-0.5", children: MAIN_NAV.map((it) => (_jsx(NavLink, { to: it.to, end: it.to === '/', className: ({ isActive }) => cn('rounded-2xl px-4 py-3 text-sm font-medium transition', isActive ? 'bg-white/[0.09] text-foreground' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'), children: it.label }, it.to))) }), _jsx("p", { className: "mb-2 mt-6 px-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground", children: "\u5FEB\u901F\u5165\u53E3" }), _jsx("div", { className: "flex flex-col gap-0.5", children: QUICK_LINKS.map((it) => (_jsxs(Link, { to: it.to, className: "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.06]", children: [_jsx(it.icon, { className: "h-4 w-4 text-primary" }), it.label] }, it.to))) }), _jsx("p", { className: "mb-2 mt-6 px-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground", children: "\u5176\u4ED6\u94FE\u63A5" }), _jsx("div", { className: "flex flex-col gap-0.5", children: OTHER_LINKS.map((it) => (_jsxs(Link, { to: it.to, className: "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] text-foreground/80 transition hover:bg-white/[0.06]", children: [_jsx(it.icon, { className: "h-4 w-4 text-muted-foreground" }), it.label] }, it.to))) })] }), _jsx("div", { className: "border-t border-white/8 p-4", children: user ? (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/[0.045] px-4 py-3", children: [_jsx(Avatar, { name: user.name, src: user.avatar, size: 36 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium", children: user.name }), _jsxs("p", { className: "mono text-[11px] text-muted-foreground", children: ["@", user.username] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(LinkButton, { to: "/account", size: "sm", variant: "glass", className: "w-full", children: "\u7528\u6237\u4E2D\u5FC3" }), isAdmin ? (_jsx(LinkButton, { to: "/admin", size: "sm", variant: "primary", className: "w-full", children: "\u540E\u53F0\u7BA1\u7406" })) : (_jsx(Button, { size: "sm", variant: "glass", onClick: () => { onLogout(); onClose(); }, children: "\u9000\u51FA\u767B\u5F55" }))] })] })) : (_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(LinkButton, { to: "/login", size: "sm", variant: "glass", className: "w-full", children: "\u767B\u5F55" }), _jsx(LinkButton, { to: "/register", size: "sm", variant: "primary", className: "w-full", children: "\u6CE8\u518C" })] })) })] })] }));
}
/* -------------------------------------------------------------------------- */
function SearchOverlay({ onClose }) {
    const [q, setQ] = useState('');
    const inputRef = useRef(null);
    useBodyLock(true);
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 60);
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(t);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);
    const go = () => {
        if (!q.trim())
            return;
        window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
    };
    const hints = ['大创项目', '挑战杯', '电子设计竞赛', '创新工坊', '学分认定'];
    return (_jsxs("div", { className: "fixed inset-0 z-[95]", children: [_jsx("div", { className: "absolute inset-0 bg-black/80 backdrop-blur-xl", onClick: onClose, style: { animation: 'sti-fade .22s ease both' } }), _jsxs("div", { className: "shell relative pt-[16vh]", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, children: [_jsx(Glass, { tone: "strong", className: "mx-auto max-w-2xl p-2", children: _jsxs("div", { className: "flex items-center gap-3 px-4", children: [_jsx(Search, { className: "h-5 w-5 shrink-0 text-muted-foreground" }), _jsx("input", { ref: inputRef, value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => e.key === 'Enter' && go(), placeholder: "\u641C\u7D22\u65B0\u95FB\u3001\u6D3B\u52A8\u3001\u9879\u76EE\u3001\u7ADE\u8D5B\u3001\u8D44\u6E90\u2026", className: "h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70" }), _jsx("kbd", { className: "mono hidden shrink-0 rounded-md border border-white/12 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground sm:block", children: "ESC" })] }) }), _jsxs("div", { className: "mx-auto mt-5 flex max-w-2xl flex-wrap items-center gap-2 px-1", children: [_jsx("span", { className: "text-[11px] text-muted-foreground", children: "\u70ED\u95E8\u641C\u7D22" }), hints.map((h) => (_jsx("button", { onClick: () => setQ(h), className: "rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] text-muted-foreground transition hover:border-white/22 hover:text-foreground", children: h }, h)))] }), _jsx("div", { className: "mx-auto mt-6 flex max-w-2xl justify-center", children: _jsx(Button, { variant: "primary", onClick: go, disabled: !q.trim(), children: "\u641C\u7D22" }) })] })] }));
}
