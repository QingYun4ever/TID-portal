import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { LiquidBackdrop, NoiseTexture } from './components/LiquidBackdrop';
import { Glass, LinkButton } from './components/ui';
import { ToastViewport } from './components/ui';
import { useAuth } from './lib/store';
import { useRevealScan } from './lib/hooks';
import useRevealObserver from './hooks/useRevealObserver';
/* ------------------------------ 懒加载页面 ------------------------------ */
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Activities = lazy(() => import('./pages/Activities'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ProjectApply = lazy(() => import('./pages/ProjectApply'));
const Competitions = lazy(() => import('./pages/Competitions'));
const Resources = lazy(() => import('./pages/Resources'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Join = lazy(() => import('./pages/Join'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const AccountOverview = lazy(() => import('./pages/account/Overview'));
const AccountSignups = lazy(() => import('./pages/account/Signups'));
const AccountApplications = lazy(() => import('./pages/account/Applications'));
const AccountMessages = lazy(() => import('./pages/account/Messages'));
const AccountJoin = lazy(() => import('./pages/account/JoinProgress'));
const AccountProfile = lazy(() => import('./pages/account/Profile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminArticles = lazy(() => import('./pages/admin/Articles'));
const AdminActivities = lazy(() => import('./pages/admin/Activities'));
const AdminSignups = lazy(() => import('./pages/admin/Signups'));
const AdminProjects = lazy(() => import('./pages/admin/Projects'));
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions'));
const AdminApplications = lazy(() => import('./pages/admin/Applications'));
const AdminResources = lazy(() => import('./pages/admin/Resources'));
const AdminJoin = lazy(() => import('./pages/admin/Join'));
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'));
const AdminGallery = lazy(() => import('./pages/admin/Gallery'));
const AdminMembers = lazy(() => import('./pages/admin/Members'));
const AdminAbout = lazy(() => import('./pages/admin/About'));
const AdminChangelog = lazy(() => import('./pages/admin/ChangelogAdmin'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminLogs = lazy(() => import('./pages/admin/Logs'));
/* ------------------------------ 加载态 ------------------------------ */
function PageLoader() {
    return (_jsx("div", { className: "flex min-h-[60vh] items-center justify-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }) }));
}
/* ------------------------------ 滚动复位 + 揭示扫描 ------------------------------ */
function RouteEffects() {
    const { pathname, search } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);
    useRevealScan(pathname + search);
    /** 异步渲染出来的 [data-reveal] 区块也需要被揭示 */
    useRevealObserver();
    // 全站使用原生滚动：不劫持 wheel、不做整屏吸附。
    // 首页的「分区节奏」由 CSS scroll-margin + 右侧导航轨道的锚点跳转承担，
    // 这样滚动手感跟随系统（含触控板惯性），不会出现吸附锁定造成的顿挫。
    return null;
}
/* ------------------------------ 权限门 ------------------------------ */
function RequireAuth({ children, admin = false }) {
    const { user, ready, isAdmin } = useAuth();
    const location = useLocation();
    if (!ready)
        return (_jsx("div", { className: "flex min-h-dvh items-center justify-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }) }));
    if (!user)
        return (_jsx("div", { className: "shell flex min-h-dvh flex-col items-center justify-center py-32 text-center", children: _jsxs(Glass, { tone: "strong", className: "max-w-md p-10", children: [_jsx(ShieldAlert, { className: "mx-auto mb-5 h-10 w-10 text-[hsl(var(--warning))]" }), _jsx("h1", { className: "text-xl font-semibold", children: "\u9700\u8981\u767B\u5F55" }), _jsx("p", { className: "mt-3 text-sm leading-relaxed text-muted-foreground", children: admin ? '该页面仅对部门管理员开放。' : '请先登录后访问用户中心。' }), _jsxs("div", { className: "mt-7 flex justify-center gap-3", children: [_jsx(LinkButton, { to: "/login", variant: "primary", children: "\u53BB\u767B\u5F55" }), _jsx(LinkButton, { to: "/", children: "\u8FD4\u56DE\u9996\u9875" })] }), _jsxs("p", { className: "mono mt-6 text-[11px] text-muted-foreground/70", children: ["from ", location.pathname] })] }) }));
    if (admin && !isAdmin)
        return (_jsx("div", { className: "shell flex min-h-dvh flex-col items-center justify-center py-32 text-center", children: _jsxs(Glass, { tone: "strong", className: "max-w-md p-10", children: [_jsx(ShieldAlert, { className: "mx-auto mb-5 h-10 w-10 text-[hsl(var(--destructive))]" }), _jsx("h1", { className: "text-xl font-semibold", children: "\u6743\u9650\u4E0D\u8DB3" }), _jsxs("p", { className: "mt-3 text-sm leading-relaxed text-muted-foreground", children: ["\u540E\u53F0\u7BA1\u7406\u9700\u8981\u300C\u7BA1\u7406\u5458\u300D\u6216\u300C\u8D85\u7EA7\u7BA1\u7406\u5458\u300D\u89D2\u8272\u3002\u5F53\u524D\u8D26\u53F7\u89D2\u8272\u4E3A\u300C", user.role, "\u300D\u3002"] }), _jsx("div", { className: "mt-7 flex justify-center gap-3", children: _jsx(LinkButton, { to: "/", variant: "primary", children: "\u8FD4\u56DE\u9996\u9875" }) })] }) }));
    return _jsx(_Fragment, { children: children });
}
/* =============================================================================
 * 根组件
 * ========================================================================== */
export default function App() {
    return (_jsxs(_Fragment, { children: [_jsx(LiquidBackdrop, {}), _jsx(NoiseTexture, {}), _jsx(RouteEffects, {}), _jsx(Nav, {}), _jsx("main", { className: "relative min-h-dvh", children: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/about", element: _jsx(About, {}) }), _jsx(Route, { path: "/news", element: _jsx(News, {}) }), _jsx(Route, { path: "/news/:slug", element: _jsx(NewsDetail, {}) }), _jsx(Route, { path: "/activities", element: _jsx(Activities, {}) }), _jsx(Route, { path: "/activities/:slug", element: _jsx(ActivityDetail, {}) }), _jsx(Route, { path: "/projects", element: _jsx(Projects, {}) }), _jsx(Route, { path: "/projects/apply", element: _jsx(ProjectApply, {}) }), _jsx(Route, { path: "/projects/:slug", element: _jsx(ProjectDetail, {}) }), _jsx(Route, { path: "/competitions", element: _jsx(Competitions, {}) }), _jsx(Route, { path: "/resources", element: _jsx(Resources, {}) }), _jsx(Route, { path: "/gallery", element: _jsx(Gallery, {}) }), _jsx(Route, { path: "/join", element: _jsx(Join, {}) }), _jsx(Route, { path: "/feedback", element: _jsx(Feedback, {}) }), _jsx(Route, { path: "/changelog", element: _jsx(Changelog, {}) }), _jsx(Route, { path: "/search", element: _jsx(Search, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsxs(Route, { path: "/account", element: _jsx(RequireAuth, { children: _jsx(AccountLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(AccountOverview, {}) }), _jsx(Route, { path: "signups", element: _jsx(AccountSignups, {}) }), _jsx(Route, { path: "applications", element: _jsx(AccountApplications, {}) }), _jsx(Route, { path: "messages", element: _jsx(AccountMessages, {}) }), _jsx(Route, { path: "join", element: _jsx(AccountJoin, {}) }), _jsx(Route, { path: "profile", element: _jsx(AccountProfile, {}) })] }), _jsxs(Route, { path: "/admin", element: _jsx(RequireAuth, { admin: true, children: _jsx(AdminLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "articles", element: _jsx(AdminArticles, {}) }), _jsx(Route, { path: "activities", element: _jsx(AdminActivities, {}) }), _jsx(Route, { path: "signups", element: _jsx(AdminSignups, {}) }), _jsx(Route, { path: "projects", element: _jsx(AdminProjects, {}) }), _jsx(Route, { path: "competitions", element: _jsx(AdminCompetitions, {}) }), _jsx(Route, { path: "applications", element: _jsx(AdminApplications, {}) }), _jsx(Route, { path: "resources", element: _jsx(AdminResources, {}) }), _jsx(Route, { path: "join", element: _jsx(AdminJoin, {}) }), _jsx(Route, { path: "feedback", element: _jsx(AdminFeedback, {}) }), _jsx(Route, { path: "gallery", element: _jsx(AdminGallery, {}) }), _jsx(Route, { path: "members", element: _jsx(AdminMembers, {}) }), _jsx(Route, { path: "about", element: _jsx(AdminAbout, {}) }), _jsx(Route, { path: "changelog", element: _jsx(AdminChangelog, {}) }), _jsx(Route, { path: "users", element: _jsx(AdminUsers, {}) }), _jsx(Route, { path: "settings", element: _jsx(AdminSettings, {}) }), _jsx(Route, { path: "logs", element: _jsx(AdminLogs, {}) })] }), _jsx(Route, { path: "/404", element: _jsx(NotFound, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) }), _jsx(Footer, {}), _jsx(ToastViewport, {})] }));
}
