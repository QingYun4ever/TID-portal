import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router';
import { ArrowUpRight, GitBranch, Github, Mail, MapPin, Phone, QrCode } from 'lucide-react';
import { useSettings } from '@/lib/store';
import { LogoLockup } from './Brand';
import { Glass } from './ui';
const COLUMNS = [
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
    return (_jsxs("footer", { className: "relative mt-20 overflow-hidden border-t border-white/8", children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-x-0 top-0 h-[1px]", style: { background: 'linear-gradient(90deg, transparent, rgba(186,230,253,.35), transparent)' } }), _jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-[120px]", style: { background: 'radial-gradient(circle, rgba(186,230,253,.08), transparent 68%)' } }), _jsxs("div", { className: "shell relative py-16 lg:py-20", children: [_jsxs("div", { className: "grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-6", children: [_jsxs("div", { className: "col-span-2", children: [_jsx(LogoLockup, { uid: "foot", size: 44, stacked: false }), _jsxs("p", { className: "mt-6 max-w-xs text-[13px] leading-relaxed text-muted-foreground", children: [settings.slogan || '以技术为舟，以创新为帆', "\u3002\u7EDF\u7B79\u5168\u6821\u5B66\u751F\u79D1\u6280\u521B\u65B0\u5DE5\u4F5C\uFF0C\u4E3A\u6BCF\u4E00\u4E2A\u60F3\u6CD5\u63D0\u4F9B\u4ECE\u7075\u611F\u5230\u843D\u5730\u7684\u652F\u6491\u3002"] }), _jsxs("div", { className: "mt-6 flex flex-col gap-2.5 text-[12px] text-muted-foreground", children: [settings.address && (_jsxs("span", { className: "flex items-center gap-2.5", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0 text-primary/70" }), settings.address] })), settings.email && (_jsxs("a", { href: `mailto:${settings.email}`, className: "flex items-center gap-2.5 transition hover:text-foreground", children: [_jsx(Mail, { className: "h-3.5 w-3.5 shrink-0 text-primary/70" }), settings.email] })), settings.phone && (_jsxs("span", { className: "mono flex items-center gap-2.5", children: [_jsx(Phone, { className: "h-3.5 w-3.5 shrink-0 text-primary/70" }), settings.phone] }))] })] }), COLUMNS.map((col) => (_jsxs("div", { children: [_jsx("h4", { className: "mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/70", children: col.title }), _jsx("ul", { className: "flex flex-col gap-3", children: col.links.map((l) => (_jsx("li", { children: _jsxs(Link, { to: l.to, className: "group inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground", children: [l.label, _jsx(ArrowUpRight, { className: "h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-60" })] }) }, l.to + l.label))) })] }, col.title)))] }), _jsxs("div", { className: "mt-14 grid gap-6 lg:grid-cols-[1fr_auto]", children: [_jsxs(Glass, { tone: "soft", className: "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "mono rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[10px] tracking-[0.14em] text-foreground/70", children: "v3.0.0" }), _jsx("span", { className: "text-[13px] font-medium", children: "\u95E8\u6237\u6301\u7EED\u8FED\u4EE3\u4E2D" })] }), _jsxs("p", { className: "mt-2 text-[12px] text-muted-foreground", children: ["\u529F\u80FD\u8C03\u6574\u3001\u754C\u9762\u6539\u7248\u4E0E\u95EE\u9898\u4FEE\u590D\u90FD\u4F1A\u8BB0\u5F55\u5728", ' ', _jsx(Link, { to: "/changelog", className: "text-primary transition hover:underline", children: "\u66F4\u65B0\u65E5\u5FD7" }), "\uFF1B\u6709\u5EFA\u8BAE\u8BF7\u5230", ' ', _jsx(Link, { to: "/feedback", className: "text-primary transition hover:underline", children: "\u4E92\u52A8\u4E0E\u53CD\u9988" }), "\u3002"] })] }), _jsxs(Link, { to: "/changelog", className: "inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-[12px] font-medium text-foreground/85 transition hover:border-white/25 hover:bg-white/[0.09]", children: [_jsx(GitBranch, { className: "h-3.5 w-3.5 text-primary" }), "\u67E5\u770B\u66F4\u65B0\u65E5\u5FD7"] })] }), _jsxs(Glass, { tone: "soft", className: "flex items-center gap-5 p-6", children: [_jsx("div", { className: "flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05]", children: settings.wechatQr ? (_jsx("img", { src: settings.wechatQr, alt: "\u5FAE\u4FE1\u516C\u4F17\u53F7\u4E8C\u7EF4\u7801", className: "h-full w-full object-cover" })) : (_jsx(QrCode, { className: "h-9 w-9 text-muted-foreground/60" })) }), _jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-medium", children: "\u5173\u6CE8\u516C\u4F17\u53F7" }), _jsx("p", { className: "mt-1.5 max-w-[180px] text-[12px] leading-relaxed text-muted-foreground", children: "\u626B\u7801\u83B7\u53D6\u7ADE\u8D5B\u63D0\u9192\u3001\u6D3B\u52A8\u9884\u544A\u4E0E\u653F\u7B56\u89E3\u8BFB" })] })] })] }), _jsx("div", { className: "hairline my-10" }), _jsxs("div", { className: "flex flex-col items-center justify-between gap-4 text-[12px] text-muted-foreground sm:flex-row", children: [_jsxs("p", { children: ["\u00A9 ", year, " \u79D1\u6280\u521B\u65B0\u90E8 \u00B7 Technology & Innovation Department", settings.icp && _jsx("span", { className: "ml-3 opacity-70", children: settings.icp })] }), _jsxs("div", { className: "flex items-center gap-5", children: [_jsx("span", { className: "mono opacity-70", children: "Portal v3.0.0" }), _jsx("a", { href: "https://github.com", target: "_blank", rel: "noreferrer noopener", className: "transition hover:text-foreground", "aria-label": "GitHub", children: _jsx(Github, { className: "h-4 w-4" }) })] })] })] })] }));
}
