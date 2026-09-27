import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router';
import { Compass, Home as HomeIcon, Search } from 'lucide-react';
import { LogoMark } from '@/components/Brand';
import { Glass, LinkButton } from '@/components/ui';
const LINKS = [
    { to: '/', label: '首页' },
    { to: '/news', label: '新闻与通知' },
    { to: '/activities', label: '活动报名' },
    { to: '/projects', label: '创新项目' },
    { to: '/resources', label: '资源中心' },
    { to: '/gallery', label: '活动画廊' },
    { to: '/join', label: '加入我们' },
];
export default function NotFound() {
    const location = useLocation();
    return (_jsx("div", { className: "relative flex min-h-dvh items-center justify-center px-5 py-32", children: _jsxs(Glass, { tone: "strong", className: "relative w-full max-w-lg overflow-hidden p-10 text-center", children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[80px]", style: { background: 'radial-gradient(circle, rgba(224,242,254,.14), transparent 66%)' } }), _jsxs("div", { className: "relative", children: [_jsx(LogoMark, { uid: "nf", animated: true, className: "mx-auto h-24 w-24" }), _jsx("p", { className: "mono mt-7 text-[11px] uppercase tracking-[0.34em] text-muted-foreground", children: "Error 404" }), _jsx("h1", { className: "mt-4 text-2xl font-semibold tracking-tight", children: _jsx("span", { className: "spotlight-text", children: "\u9875\u9762\u8D70\u4E22\u4E86" }) }), _jsx("p", { className: "mt-4 text-[13.5px] leading-relaxed text-muted-foreground", children: "\u6CA1\u6709\u627E\u5230\u4F60\u8981\u8BBF\u95EE\u7684\u9875\u9762\u3002\u53EF\u80FD\u662F\u94FE\u63A5\u5DF2\u5931\u6548\uFF0C\u6216\u8005\u5730\u5740\u8F93\u5165\u6709\u8BEF\u3002" }), _jsx("p", { className: "mono mt-3 truncate rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] text-muted-foreground", children: location.pathname }), _jsxs("div", { className: "mt-8 flex flex-wrap justify-center gap-3", children: [_jsxs(LinkButton, { to: "/", variant: "primary", children: [_jsx(HomeIcon, { className: "h-4 w-4" }), "\u8FD4\u56DE\u9996\u9875"] }), _jsxs(LinkButton, { to: "/search", children: [_jsx(Search, { className: "h-4 w-4" }), "\u5168\u7AD9\u641C\u7D22"] })] }), _jsx("div", { className: "hairline my-8" }), _jsxs("div", { className: "flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[12px]", children: [_jsx(Compass, { className: "h-3.5 w-3.5 text-muted-foreground" }), LINKS.map((l) => (_jsx(Link, { to: l.to, className: "text-muted-foreground transition hover:text-primary", children: l.label }, l.to)))] })] })] }) }));
}
