import React, { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';

import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { LiquidBackdrop, NoiseTexture } from './components/LiquidBackdrop';
import { Glass, Button, LinkButton } from './components/ui';
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
const Gallery = lazy(() => import('./pages/Gallery'));
const Join = lazy(() => import('./pages/Join'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Login = lazy(() => import('./pages/Login'));
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
const AdminJoin = lazy(() => import('./pages/admin/Join'));
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'));
const AdminGallery = lazy(() => import('./pages/admin/Gallery'));
const AdminMembers = lazy(() => import('./pages/admin/Members'));
const AdminAbout = lazy(() => import('./pages/admin/About'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminLogs = lazy(() => import('./pages/admin/Logs'));

/* ------------------------------ 加载态 ------------------------------ */
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/* ------------------------------ 滚动复位 + 揭示扫描 ------------------------------ */
function RouteEffects() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
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
function RequireAuth({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();

  if (!ready)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  if (!user)
    return (
      <div className="shell flex min-h-dvh flex-col items-center justify-center py-32 text-center">
        <Glass tone="strong" className="max-w-md p-10">
          <ShieldAlert className="mx-auto mb-5 h-10 w-10 text-[hsl(var(--warning))]" />
          <h1 className="text-xl font-semibold">需要登录</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {admin ? '该页面仅对部门管理员开放。' : '请先登录后访问用户中心。'}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <LinkButton to={`/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`} variant="primary">
              去登录
            </LinkButton>
            <LinkButton to="/">返回首页</LinkButton>
          </div>
          <p className="mono mt-6 text-[11px] text-muted-foreground/70">from {location.pathname}</p>
        </Glass>
      </div>
    );

  if (admin && !isAdmin)
    return (
      <div className="shell flex min-h-dvh flex-col items-center justify-center py-32 text-center">
        <Glass tone="strong" className="max-w-md p-10">
          <ShieldAlert className="mx-auto mb-5 h-10 w-10 text-[hsl(var(--destructive))]" />
          <h1 className="text-xl font-semibold">权限不足</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            后台管理需要「管理员」或「超级管理员」角色。当前账号角色为「{user.role}」。
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <LinkButton to="/" variant="primary">
              返回首页
            </LinkButton>
          </div>
        </Glass>
      </div>
    );

  return <>{children}</>;
}

/* =============================================================================
 * 根组件
 * ========================================================================== */
export default function App() {
  return (
    <>
      <LiquidBackdrop />
      <NoiseTexture />
      <RouteEffects />
      <Nav />

      <main className="relative min-h-dvh">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ---------- 门户 ---------- */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />

            <Route path="/news" element={<News />} />
            <Route path="/news/:slug" element={<NewsDetail />} />

            <Route path="/activities" element={<Activities />} />
            <Route path="/activities/:slug" element={<ActivityDetail />} />

            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/apply" element={<ProjectApply />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />

            <Route path="/competitions" element={<Competitions />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/join" element={<Join />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* ---------- 认证 ---------- */}
            <Route path="/login" element={<Login />} />

            {/* ---------- 用户中心 ---------- */}
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AccountOverview />} />
              <Route path="signups" element={<AccountSignups />} />
              <Route path="applications" element={<AccountApplications />} />
              <Route path="messages" element={<AccountMessages />} />
              <Route path="join" element={<AccountJoin />} />
              <Route path="profile" element={<AccountProfile />} />
            </Route>

            {/* ---------- 后台管理 ---------- */}
            <Route
              path="/admin"
              element={
                <RequireAuth admin>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="activities" element={<AdminActivities />} />
              <Route path="signups" element={<AdminSignups />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="competitions" element={<AdminCompetitions />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="join" element={<AdminJoin />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="gallery" element={<AdminGallery />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="about" element={<AdminAbout />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="logs" element={<AdminLogs />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <ToastViewport />
    </>
  );
}
