import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, Compass, Download, Eye, FileText, Layers, MessageSquare, Rocket, Trophy, Users, } from 'lucide-react';
import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useActiveSection, useScrollVar } from '@/lib/hooks';
import { useSettings, useToast } from '@/lib/store';
import { NEWS_CATEGORIES, cn, fnum, plain } from '@/lib/utils';
import { LogoMark } from '@/components/Brand';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { OrbitalCanvas } from '@/components/OrbitalCanvas';
import { ActivityCard, ArticleCard, CompetitionCard, ProjectCard, ResourceCard } from '@/components/cards';
import { Chip, Dot, Glass, LinkButton, Section, Skeleton, Tabs } from '@/components/ui';
/* =============================================================================
 * 首页 —— 下滑式「一屏一块」布局
 *
 * 布局约定：
 *   · 每个分区独占一整屏（<Screen> = <Section screen>）
 *   · 相关内容合并到同一屏，共 9 屏
 *   · 卡片数量随分辨率自适应（useDensity），保证「一屏装满且不溢出」
 *   · 原生滚动，不劫持滚轮、不做整屏吸附（节奏由右侧导航轨道的锚点承担）
 *
 * 动效约定（重新设计）：
 *   · 入场一次性：首屏用 .st-rise 分级错位上浮，级差 70ms，最深 0.45s 结束
 *   · 常驻只留「呼吸」：.st-breathe 的光晕、.st-rule 的一道流光，其余全静
 *   · 滚动揭示统一走 [data-reveal]，级差收到 45ms —— 同时在动的元素越少越顺
 *   · 进度条走 CSS 变量 --scroll-p + scaleX，滚动过程中 React 不重渲染
 * ========================================================================== */
/** 首屏进场：统一的分级上浮 */
const rise = (delay) => ({ animationDelay: `${delay}ms` });
/** 滚动揭示：统一的分级延迟（级差 45ms，最多累到第 6 个） */
const stagger = (i, step = 45) => ({ transitionDelay: `${Math.min(i, 5) * step}ms` });
const SECTIONS = [
    { id: 'hero', label: '首页' },
    { id: 'quick', label: '快速入口' },
    { id: 'news', label: '历程与新闻' },
    { id: 'activities', label: '活动与申报' },
    { id: 'projects', label: '成果与竞赛' },
    { id: 'gallery', label: '活动画廊' },
    { id: 'resources', label: '资源中心' },
    { id: 'org', label: '组织与成员' },
    { id: 'join', label: '加入我们' },
];
/** 首页专用：让每个分区独占一整屏 */
function Screen(props) {
    return _jsx(Section, { screen: true, ...props });
}
/* -----------------------------------------------------------------------------
 * 屏显密度：分辨率越高，每屏塞下的卡片越多。返回 0–3 级
 *   0 常规(<1280×800)  1 宽屏(≥1280×800)  2 大屏(≥1600×900)  3 高分(≥1920×1040)
 * -------------------------------------------------------------------------- */
function useDensity() {
    const [level, setLevel] = useState(0);
    useEffect(() => {
        const calc = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            let lv = 0;
            if (w >= 1280 && h >= 800)
                lv = 1;
            if (w >= 1600 && h >= 900)
                lv = 2;
            if (w >= 1920 && h >= 1040)
                lv = 3;
            setLevel(lv);
        };
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);
    return level;
}
/** 按密度等级取值 */
const pick = (arr, level) => arr[Math.min(arr.length - 1, Math.max(0, level))];
export default function Home() {
    const { data, loading } = useApi(() => PublicApi.overview(), []);
    const { settings } = useSettings();
    const toast = useToast();
    useScrollVar();
    const active = useActiveSection(SECTIONS.map((s) => s.id));
    const dens = useDensity();
    const d = data ?? {};
    const s = d.settings ?? {};
    const stats = d.stats ?? {};
    const [newsTab, setNewsTab] = useState('all');
    const downloadResource = async (r) => {
        try {
            const out = await SubmitApi.downloadResource(r.id);
            if (r.url && r.url !== '#')
                window.open(r.url, '_blank');
            else
                toast.info('演示数据', '该资源为演示条目，未绑定真实文件。可在后台「资源中心」上传实际文件。');
            toast.success('开始下载', `${r.title}（${fnum(out.downloads)} 次下载）`);
        }
        catch (e) {
            toast.error('下载失败', e.message);
        }
    };
    const filteredNews = useMemo(() => {
        const list = d.featuredArticles ?? [];
        return (newsTab === 'all' ? list : list.filter((a) => a.category === newsTab)).slice(0, 4);
    }, [d.featuredArticles, newsTab]);
    const catCount = useMemo(() => {
        const m = {};
        for (const a of d.featuredArticles ?? [])
            m[a.category] = (m[a.category] ?? 0) + 1;
        return m;
    }, [d.featuredArticles]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { "aria-hidden": true, className: "scroll-progress" }), _jsx(BrandBackdrop, { peakOpacity: 0.42, scale: 1.72, reveal: 0.58, side: "left" }), _jsx(SectionRail, { sections: SECTIONS, active: active }), _jsx(Hero, { settings: s }), _jsx(QuickAbout, { quickCount: 4, stats: stats, intro: s.intro }), _jsx(HistoryNews, { timeline: d.timeline ?? [], articles: filteredNews, notices: d.notices ?? [], tab: newsTab, onTab: setNewsTab, catCount: catCount, loading: loading, dens: dens }), _jsx(ActivityApply, { activities: d.activities ?? [], loading: loading, dens: dens }), _jsx(ProjectCompetition, { projects: d.projects ?? [], competitions: d.competitions ?? [], loading: loading, dens: dens }), _jsx(GalleryBlock, { images: d.gallery ?? [], loading: loading, dens: dens }), _jsx(ResourceBlock, { onDownload: downloadResource, dens: dens }), _jsx(OrgMembers, { members: d.members ?? [], loading: loading, dens: dens }), _jsx(JoinBlock, { stats: stats })] }));
}
/* =============================================================================
 * 右侧分区导航
 * ========================================================================== */
function SectionRail({ sections, active }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("nav", { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), className: "st-fade fixed right-5 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-end gap-2.5 xl:flex", 
        /* 等首屏进场走完再出现，避免和 Hero 的级联抢注意力 */
        style: { animationDelay: '1050ms' }, children: sections.map((sec) => {
            const isActive = active === sec.id;
            return (_jsxs("a", { href: `#${sec.id}`, className: "group flex items-center gap-3", "aria-label": sec.label, children: [_jsx("span", { className: cn('whitespace-nowrap rounded-full border px-2.5 py-1 text-[10.5px] transition-all duration-300', hovered || isActive ? 'opacity-100' : 'translate-x-1 opacity-0', isActive
                            ? 'border-primary/40 bg-primary/12 text-primary'
                            : 'border-white/10 bg-black/45 text-muted-foreground backdrop-blur-md'), children: sec.label }), _jsx("span", { className: cn('block rounded-full transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)]', isActive ? 'h-[18px] w-[3px] bg-primary shadow-[0_0_10px_hsl(var(--primary)/.9)]' : 'h-[5px] w-[3px] bg-white/22 group-hover:bg-white/45') })] }, sec.id));
        }) }));
}
/* =============================================================================
 * 1. 首屏
 * ========================================================================== */
function Hero({ settings }) {
    return (_jsxs("section", { id: "hero", className: "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 pb-10 pt-20", children: [_jsxs("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0", children: [_jsx(GridTexture, { className: "opacity-70", size: 64 }), _jsx(GlowOrb, { className: "left-1/2 top-[14%] -translate-x-1/2", size: 780, color: "rgba(186,230,253,.12)" })] }), _jsx(OrbitalCanvas, { className: "z-[1]" }), _jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[80vh] w-[min(1180px,96vw)] -translate-x-1/2 -translate-y-1/2", style: { background: 'radial-gradient(ellipse 62% 52% at 50% 50%, rgba(0,0,0,.58) 0%, rgba(0,0,0,.34) 48%, transparent 76%)' } }), _jsxs("div", { className: "relative z-10 flex w-full max-w-4xl flex-col items-center text-center", children: [_jsxs("div", { className: "st-rise relative mb-5", style: rise(0), children: [_jsx("div", { "aria-hidden": true, className: "st-breathe absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full", style: {
                                    background: 'radial-gradient(circle, rgba(186,230,253,.19) 0%, rgba(186,230,253,.10) 30%, rgba(186,230,253,.03) 52%, transparent 72%)',
                                } }), _jsx(LogoMark, { uid: "hero", animated: true, spin: true, spinDuration: 28, className: "relative h-[172px] w-[172px] sm:h-[214px] sm:w-[214px]" })] }), _jsx("h1", { className: "st-rise text-balance text-[2.3rem] font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl", style: rise(70), children: _jsx("span", { className: "aurora-text", children: "\u79D1\u6280\u521B\u65B0\u90E8" }) }), _jsx("p", { className: "mono st-rise mt-4 text-[10px] font-medium uppercase text-muted-foreground sm:text-[11px]", style: { letterSpacing: '0.34em', ...rise(140) }, children: "TECHNOLOGY & INNOVATION DEPARTMENT" }), _jsxs("div", { className: "st-rise mt-5 flex items-center gap-4", style: rise(210), children: [_jsx("span", { "aria-hidden": true, className: "hidden w-14 sm:block", children: _jsx("span", { className: "st-rule st-draw block", style: rise(560) }) }), _jsx("p", { className: "text-lg font-light text-foreground/80", children: settings.slogan || '以技术为舟，以创新为帆' }), _jsx("span", { "aria-hidden": true, className: "hidden w-14 -scale-x-100 sm:block", children: _jsx("span", { className: "st-rule st-draw block", style: rise(560) }) })] }), _jsxs("div", { className: "st-rise mt-7 flex flex-wrap items-center justify-center gap-3", style: rise(280), children: [_jsxs(LinkButton, { to: "/projects", variant: "primary", size: "lg", children: [_jsx(Rocket, { className: "h-4 w-4" }), "\u6D4F\u89C8\u521B\u65B0\u9879\u76EE"] }), _jsxs(LinkButton, { to: "/activities", variant: "glass", size: "lg", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), "\u6D3B\u52A8\u62A5\u540D"] })] })] }), _jsxs("div", { "aria-hidden": true, className: "st-rise absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5", style: rise(900), children: [_jsx("span", { className: "mono text-[9.5px] tracking-[0.3em] text-muted-foreground/70", children: "SCROLL" }), _jsx("span", { className: "scroll-cue-line block h-9 w-px bg-white/10" })] })] }));
}
/* =============================================================================
 * 2. 快速入口 + 部门概况（合并一屏）
 * ========================================================================== */
const QUICK = [
    { icon: CalendarDays, title: '活动报名', desc: '技术沙龙 · 工作坊 · 竞赛集训', to: '/activities' },
    { icon: FileText, title: '项目申报', desc: '大创项目在线申报与进度查询', to: '/projects/apply' },
    { icon: Download, title: '资源下载', desc: '申报书模板 · 竞赛指南 · 培训资料', to: '/resources' },
    { icon: Users, title: '加入我们', desc: '招新公告 · 岗位介绍 · 报名表', to: '/join' },
];
function QuickAbout({ stats, intro }) {
    const items = [
        { label: '成立年份', value: '2015', unit: '年' },
        { label: '服务学生', value: fnum((stats.signups ?? 0) + 4000), unit: '人次' },
        { label: '在展项目', value: String(stats.projects ?? 0), unit: '项' },
        { label: '部门成员', value: String(stats.members ?? 0), unit: '人' },
    ];
    const duties = [
        '统筹全校学生科技创新竞赛的组织、报名、培训与选拔',
        '负责大学生创新创业训练计划项目的立项与结题验收',
        '运营门户网站、成果画廊与竞赛信息聚合平台',
        '开展科技文化节、技术沙龙、创新工作坊等品牌活动',
    ];
    return (_jsx(Screen, { id: "quick", eyebrow: "Portal & About", title: "\u5FEB\u901F\u5165\u53E3\u4E0E\u90E8\u95E8\u6982\u51B5", description: intro ? plain(intro, 108) : undefined, action: _jsxs(LinkButton, { to: "/about", children: ["\u4E86\u89E3\u90E8\u95E8\u5168\u8C8C ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), children: _jsxs("div", { className: "grid gap-4 lg:grid-cols-[1.05fr_1fr]", children: [_jsx("div", { className: "grid grid-cols-2 gap-3.5", children: QUICK.map((q, i) => (_jsx(Link, { to: q.to, "data-reveal": "scale", style: stagger(i), className: "group block", children: _jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "flex h-full min-h-[124px] flex-col justify-between p-4", children: [_jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-foreground/80 transition-all duration-400 group-hover:border-primary/40 group-hover:text-primary", children: _jsx(q.icon, { className: "h-[17px] w-[17px]" }) }), _jsxs("div", { children: [_jsxs("h3", { className: "flex items-center gap-1.5 text-[13.5px] font-medium", children: [q.title, _jsx(ArrowUpRight, { className: "h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" })] }), _jsx("p", { className: "clamp-1 mt-1 text-[11.5px] leading-relaxed text-muted-foreground", children: q.desc })] })] }) }, q.to))) }), _jsxs("div", { className: "flex flex-col gap-3.5", children: [_jsx("div", { className: "grid grid-cols-2 gap-3.5", children: items.map((it, i) => (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "p-4", "data-reveal": "scale", style: stagger(i), children: [_jsx("p", { className: "text-[10.5px] tracking-wide text-muted-foreground", children: it.label }), _jsx("p", { className: "mono mt-2 text-xl font-semibold text-primary", children: it.value }), _jsx("p", { className: "mt-0.5 text-[10.5px] text-muted-foreground", children: it.unit })] }, it.label))) }), _jsxs(Glass, { tone: "soft", className: "p-4", "data-reveal": true, style: stagger(4), children: [_jsx("h3", { className: "text-[13.5px] font-medium", children: "\u6838\u5FC3\u804C\u8D23" }), _jsx("ul", { className: "mt-3 grid gap-2 sm:grid-cols-2", children: duties.map((t) => (_jsxs("li", { className: "flex items-start gap-2 text-[11.5px] leading-relaxed text-foreground/75", children: [_jsx("span", { className: "mt-[6px] h-1 w-1 shrink-0 rounded-full bg-primary" }), t] }, t))) })] })] })] }) }));
}
/* =============================================================================
 * 3. 发展历程 + 新闻与通知（合并一屏）
 * ========================================================================== */
function HistoryNews({ timeline, articles, notices, tab, onTab, catCount, loading, dens, }) {
    const tabs = [
        { value: 'all', label: '全部' },
        ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label, count: catCount[value] })),
    ];
    const first = articles[0];
    const timelineCount = pick([6, 6, 7, 7], dens);
    return (_jsx(Screen, { id: "news", eyebrow: "Milestones & News", title: "\u53D1\u5C55\u5386\u7A0B\u4E0E\u65B0\u95FB\u901A\u77E5", description: "\u4ECE 2015 \u5E74\u6210\u7ACB\u81F3\u4ECA\uFF1B\u901A\u77E5\u516C\u544A\u3001\u90E8\u95E8\u65B0\u95FB\u3001\u7ADE\u8D5B\u4FE1\u606F\u4E0E\u653F\u7B56\u6587\u4EF6\u5B9E\u65F6\u540C\u6B65\u3002", action: _jsxs(LinkButton, { to: "/news", children: ["\u5168\u90E8\u5185\u5BB9 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), children: _jsxs("div", { className: "grid gap-5 lg:grid-cols-[0.82fr_1.18fr]", children: [_jsxs(Glass, { tone: "soft", className: "flex flex-col p-5", "data-reveal": "left", children: [_jsxs("h3", { className: "mb-3.5 flex items-center gap-2.5 text-[14.5px] font-medium", children: [_jsx(Compass, { className: "h-4 w-4 text-primary" }), "\u53D1\u5C55\u5386\u7A0B"] }), _jsx("div", { className: "flex flex-1 flex-col", children: timeline.length === 0
                                ? Array.from({ length: 5 }).map((_, i) => _jsx(Skeleton, { className: "mb-2 h-10" }, i))
                                : timeline.slice(0, timelineCount).map((t, i, arr) => (_jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex w-10 shrink-0 flex-col items-center", children: [_jsx("span", { className: "mono text-[11.5px] font-semibold text-primary", children: t.year }), _jsx("span", { className: "mt-1 h-2 w-2 rounded-full border-2 border-primary bg-background" }), i < arr.length - 1 && _jsx("span", { className: "mt-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" })] }), _jsx("div", { className: cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-2.5' : ''), children: _jsx("p", { className: "text-[12.5px] font-medium leading-snug", children: t.title }) })] }, t.id))) }), _jsx(Link, { to: "/about", className: "mt-3 text-[11.5px] text-primary transition hover:underline", children: "\u67E5\u770B\u5B8C\u6574\u5386\u7A0B \u2192" })] }), _jsxs("div", { className: "flex flex-col gap-3.5", children: [_jsx("div", { "data-reveal": true, children: _jsx(Tabs, { items: tabs, value: tab, onChange: onTab, size: "sm" }) }), _jsxs("div", { className: "grid gap-3.5 sm:grid-cols-[1.1fr_1fr]", children: [loading ? (_jsx(Skeleton, { className: "h-[210px]" })) : first ? (
                                /* 头条直接复用 ArticleCard 的 featured 形态 ——
                                   原来这里是一张自绘的 Glass + overflow-hidden 卡：
                                   外壳同时承担圆角、裁剪与毛玻璃，正是封面边缘出现阶梯锯齿的写法。 */
                                _jsx("div", { "data-reveal": true, children: _jsx(ArticleCard, { article: first, featured: true }) })) : (_jsx(Glass, { tone: "soft", className: "p-8 text-center text-sm text-muted-foreground", children: "\u8BE5\u5206\u7C7B\u4E0B\u6682\u65E0\u5185\u5BB9" })), _jsxs(Glass, { tone: "soft", className: "p-4", "data-reveal": "right", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("h3", { className: "flex items-center gap-2 text-[13.5px] font-medium", children: [_jsx(Bell, { className: "h-3.5 w-3.5 text-[hsl(var(--warning))]" }), "\u901A\u77E5\u516C\u544A"] }), _jsx(Link, { to: "/news?category=notice", className: "text-[10.5px] text-primary transition hover:underline", children: "\u66F4\u591A" })] }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [loading
                                                    ? Array.from({ length: 4 }).map((_, i) => _jsx(Skeleton, { className: "h-12" }, i))
                                                    : notices.slice(0, pick([4, 4, 5, 5], dens)).map((n) => _jsx(ArticleCard, { article: n, compact: true }, n.id)), !loading && !notices.length && _jsx("p", { className: "py-5 text-center text-xs text-muted-foreground", children: "\u6682\u65E0\u901A\u77E5" })] })] })] })] })] }) }));
}
/* =============================================================================
 * 4. 活动预告 + 项目申报（合并一屏）
 * ========================================================================== */
function ActivityApply({ activities, loading, dens }) {
    const steps = [
        { t: '在线填写申报书', d: '项目名称、团队信息、技术路线' },
        { t: '上传支撑材料', d: '申报书 PDF、指导教师意见' },
        { t: '部门初审', d: '5 个工作日内反馈受理结果' },
        { t: '专家评审与公示', d: '结果公示，可在线查询进度' },
    ];
    const count = pick([3, 3, 4, 4], dens);
    return (_jsxs(Screen, { id: "activities", eyebrow: "Events & Application", title: "\u6D3B\u52A8\u9884\u544A\u4E0E\u9879\u76EE\u7533\u62A5", description: "\u6D3B\u52A8\u5728\u7EBF\u62A5\u540D\u3001\u540D\u989D\u4E0E\u622A\u6B62\u5012\u8BA1\u65F6\uFF1B\u5927\u521B\u9879\u76EE\u4ECE\u63D0\u4EA4\u5230\u7ED3\u679C\u516C\u793A\u5168\u6D41\u7A0B\u7EBF\u4E0A\u5316\u3002", action: _jsxs(_Fragment, { children: [_jsxs(LinkButton, { to: "/activities", children: ["\u5168\u90E8\u6D3B\u52A8 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsxs(LinkButton, { to: "/projects/apply", variant: "primary", children: [_jsx(FileText, { className: "h-4 w-4" }), "\u7ACB\u5373\u7533\u62A5"] })] }), children: [_jsxs("div", { className: cn('grid gap-4', count >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'), children: [loading
                        ? Array.from({ length: count }).map((_, i) => _jsx(Skeleton, { className: "h-[236px]" }, i))
                        : activities.slice(0, count).map((a, i) => (_jsx("div", { "data-reveal": "scale", style: stagger(i), children: _jsx(ActivityCard, { activity: a }) }, a.id))), !loading && !activities.length && (_jsx(Glass, { tone: "soft", className: "p-8 text-center text-sm text-muted-foreground lg:col-span-3", children: "\u8FD1\u671F\u6682\u65E0\u6D3B\u52A8\uFF0C\u656C\u8BF7\u5173\u6CE8\u540E\u7EED\u901A\u77E5" }))] }), _jsx("div", { className: "mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4", children: steps.map((step, i) => (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "flex items-start gap-3 p-4", "data-reveal": "scale", style: stagger(i), children: [_jsx("span", { className: "mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[11.5px] font-semibold text-primary", children: i + 1 }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-[12.5px] font-medium", children: step.t }), _jsx("p", { className: "mt-1 text-[11px] leading-relaxed text-muted-foreground", children: step.d })] })] }, step.t))) })] }));
}
/* =============================================================================
 * 5. 创新成果 + 竞赛信息（合并一屏）
 * ========================================================================== */
function ProjectCompetition({ projects, competitions, loading, dens, }) {
    const hero = projects[0];
    const rest = projects.slice(1, pick([2, 2, 3, 3], dens));
    const compCount = pick([2, 2, 2, 3], dens);
    return (_jsx(Screen, { id: "projects", eyebrow: "Showcase & Competitions", title: "\u521B\u65B0\u6210\u679C\u4E0E\u7ADE\u8D5B\u4FE1\u606F", description: "\u9879\u76EE\u5C55\u793A\u5E93\u8986\u76D6\u4F18\u79C0\u3001\u7ACB\u9879\u3001\u7ED3\u9879\u4E0E\u5728\u7814\u9879\u76EE\uFF1B\u7ADE\u8D5B\u4FE1\u606F\u805A\u5408\uFF0C\u5012\u8BA1\u65F6\u63D0\u9192\u4E0D\u9519\u8FC7\u622A\u6B62\u3002", action: _jsxs(_Fragment, { children: [_jsxs(LinkButton, { to: "/projects", children: ["\u9879\u76EE\u5C55\u793A\u5E93 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsxs(LinkButton, { to: "/competitions", children: [_jsx(Trophy, { className: "h-4 w-4" }), "\u7ADE\u8D5B\u65E5\u5386"] })] }), children: _jsxs("div", { className: "grid gap-5 lg:grid-cols-[1.25fr_1fr]", children: [_jsx("div", { className: "flex flex-col gap-3.5", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Skeleton, { className: "h-[210px]" }), _jsxs("div", { className: "grid grid-cols-2 gap-3.5", children: [_jsx(Skeleton, { className: "h-[130px]" }), _jsx(Skeleton, { className: "h-[130px]" })] })] })) : (_jsxs(_Fragment, { children: [hero && (_jsx("div", { "data-reveal": true, children: _jsx(ProjectCard, { project: hero, size: "sm" }) })), _jsx("div", { className: "grid grid-cols-2 gap-3.5", children: rest.map((p, i) => (_jsx("div", { "data-reveal": "scale", style: stagger(i), children: _jsx(ProjectCard, { project: p, size: "sm" }) }, p.id))) })] })) }), _jsx("div", { className: "flex flex-col gap-3.5", children: loading
                        ? Array.from({ length: compCount }).map((_, i) => _jsx(Skeleton, { className: "h-[150px]" }, i))
                        : competitions.slice(0, compCount).map((c, i) => (_jsx("div", { "data-reveal": "right", style: stagger(i), children: _jsx(CompetitionCard, { competition: c }) }, c.id))) })] }) }));
}
/* =============================================================================
 * 6. 活动画廊（独占一屏，照片数随分辨率增加）
 * ========================================================================== */
function GalleryBlock({ images, loading, dens }) {
    const count = pick([8, 8, 12, 12], dens);
    return (_jsx(Screen, { id: "gallery", eyebrow: "Gallery", title: "\u6D3B\u52A8\u753B\u5ECA", description: "\u79D1\u6280\u6587\u5316\u8282\u3001\u7ADE\u8D5B\u73B0\u573A\u3001\u521B\u65B0\u5DE5\u574A\u4E0E\u8BB2\u5EA7\u6C99\u9F99\u7684\u5F71\u50CF\u8BB0\u5F55\u3002", action: _jsxs(LinkButton, { to: "/gallery", children: ["\u8FDB\u5165\u753B\u5ECA ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), children: _jsx("div", { className: cn('grid grid-cols-2 gap-4 sm:grid-cols-4', count > 8 && '2xl:grid-cols-6'), children: loading
                ? Array.from({ length: count }).map((_, i) => _jsx(Skeleton, { className: "aspect-[4/3]" }, i))
                : images.slice(0, count).map((img, i) => (_jsx(Link, { to: "/gallery", "data-reveal": "scale", style: stagger(i % 6, 38), className: "group block", children: _jsx("div", { className: "card", children: _jsxs("div", { className: "card-media aspect-[4/3]", children: [_jsx("img", { src: img.url, alt: img.title, loading: "lazy" }), _jsx("span", { "aria-hidden": true, className: "card-scrim" }), _jsx("p", { className: "clamp-1 absolute inset-x-0 bottom-0 px-3 pb-2.5 text-[11.5px] font-medium text-white/95", children: img.title })] }) }) }, img.id))) }) }));
}
/* =============================================================================
 * 7. 资源中心（独占一屏）
 * ========================================================================== */
function ResourceBlock({ onDownload, dens }) {
    const { data, loading } = useApi(() => PublicApi.resources(), []);
    const count = pick([6, 6, 8, 8], dens);
    const list = (data ?? []).slice(0, count);
    return (_jsx(Screen, { id: "resources", eyebrow: "Resources", title: "\u8D44\u6E90\u4E2D\u5FC3", description: "\u7533\u62A5\u4E66\u6A21\u677F\u3001\u5546\u4E1A\u8BA1\u5212\u4E66\u3001\u8DEF\u6F14 PPT\u3001\u653F\u7B56\u6587\u4EF6\u3001\u7ADE\u8D5B\u6307\u5357\u4E0E\u57F9\u8BAD\u8D44\u6599\u3002", action: _jsxs(LinkButton, { to: "/resources", children: ["\u5168\u90E8\u8D44\u6E90 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), children: _jsx("div", { className: cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', count > 6 && '2xl:grid-cols-4'), children: loading
                ? Array.from({ length: count }).map((_, i) => _jsx(Skeleton, { className: "h-40" }, i))
                : list.map((r, i) => (_jsx("div", { "data-reveal": "scale", style: stagger(i % 4), children: _jsx(ResourceCard, { resource: r, onDownload: onDownload }) }, r.id))) }) }));
}
/* =============================================================================
 * 8. 组织架构 + 成员风采（合并一屏）
 * ========================================================================== */
function OrgMembers({ members, loading, dens }) {
    const { data, loading: orgLoading } = useApi(() => PublicApi.about(), []);
    const org = data?.org ?? [];
    const memberCount = pick([8, 8, 12, 12], dens);
    return (_jsx(Screen, { id: "org", eyebrow: "Organization & Team", title: "\u7EC4\u7EC7\u67B6\u6784\u4E0E\u6210\u5458\u98CE\u91C7", description: "\u56DB\u4E2A\u5DE5\u4F5C\u7EC4\u534F\u540C\u8FD0\u8F6C\uFF0C\u6210\u5458\u6765\u81EA\u5168\u6821\u591A\u4E2A\u5B66\u9662\u3002", action: _jsxs(LinkButton, { to: "/about#members", children: ["\u8BA4\u8BC6\u5168\u4F53\u6210\u5458 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), children: _jsxs("div", { className: "flex flex-col gap-5", children: [orgLoading ? (_jsx("div", { className: "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-24" }, i))) })) : (_jsx("div", { className: "flex flex-col gap-3.5", children: org.map((root) => (_jsxs(React.Fragment, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", "data-reveal": true, children: [_jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary", children: _jsx(Users, { className: "h-3.5 w-3.5" }) }), _jsx("p", { className: "text-[13px] font-medium", children: root.name }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: root.leader }), _jsxs(Chip, { className: "ml-auto", children: [(root.children ?? []).length, " \u4E2A\u5DE5\u4F5C\u7EC4"] })] }), _jsx("div", { className: "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4", children: (root.children ?? []).map((c, i) => (_jsxs(Glass, { tone: "thin", hover: true, className: "flex h-full flex-col p-4", "data-reveal": "scale", style: stagger(i), children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Compass, { className: "h-3.5 w-3.5 text-primary/80" }), _jsx("p", { className: "text-[12.5px] font-medium", children: c.name })] }), _jsx("p", { className: "clamp-2 mt-2 flex-1 text-[11px] leading-relaxed text-muted-foreground", children: c.description })] }, c.id))) })] }, root.id))) })), _jsx("div", { className: cn('grid grid-cols-2 gap-3.5 sm:grid-cols-4', memberCount > 8 && '2xl:grid-cols-6'), children: loading
                        ? Array.from({ length: memberCount }).map((_, i) => _jsx(Skeleton, { className: "h-[104px]" }, i))
                        : members.slice(0, memberCount).map((m, i) => (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "flex flex-col items-center p-3.5 text-center", "data-reveal": "scale", style: stagger(i % 6, 38), children: [_jsxs("div", { className: "relative", children: [_jsx(LogoMark, { uid: `m${m.id}`, monochrome: true, className: "h-9 w-9 text-white/18" }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center text-[12px] font-medium text-foreground", children: m.name.slice(-2) })] }), _jsx("p", { className: "mt-2 text-[12.5px] font-medium", children: m.name }), _jsx("p", { className: "clamp-1 mt-0.5 text-[10px] text-primary", children: m.role })] }, m.id))) })] }) }));
}
/* =============================================================================
 * 9. 加入我们（独占一屏）
 * ========================================================================== */
function JoinBlock({ stats }) {
    return (_jsx(Screen, { id: "join", container: "shell", children: _jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-8 sm:p-12 lg:p-14", "data-reveal": "scale", children: [_jsx(GlowOrb, { className: "st-breathe -left-24 -top-24", size: 520, color: "rgba(186,230,253,.11)" }), _jsx(GlowOrb, { className: "st-breathe -bottom-32 -right-20", size: 480, color: "rgba(255,255,255,.06)", style: { animationDelay: '-7s' } }), _jsx(GridTexture, { className: "opacity-40", size: 52 }), _jsxs("div", { className: "relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow mb-5", children: "Join Us" }), _jsxs("h2", { className: "text-balance text-3xl font-semibold leading-[1.15] tracking-tight", children: ["\u548C\u6211\u4EEC\u4E00\u8D77\uFF0C", _jsx("br", { className: "hidden sm:block" }), "\u628A\u60F3\u6CD5\u53D8\u6210\u53EF\u8FD0\u884C\u7684\u4E1C\u897F"] }), _jsx("p", { className: "mt-5 max-w-xl text-pretty text-[14px] leading-[1.85] text-muted-foreground", children: "\u65E0\u8BBA\u4F60\u64C5\u957F\u5199\u4EE3\u7801\u3001\u505A\u8BBE\u8BA1\u3001\u5199\u6587\u6848\uFF0C\u8FD8\u662F\u5355\u7EAF\u5BF9\u67D0\u4E2A\u9886\u57DF\u5145\u6EE1\u597D\u5947 \u2014\u2014 \u79D1\u6280\u521B\u65B0\u90E8\u90FD\u6B22\u8FCE\u4F60\u3002" }), _jsxs("div", { className: "mt-7 flex flex-wrap items-center gap-3.5", children: [_jsxs(LinkButton, { to: "/join", variant: "primary", size: "lg", children: ["\u67E5\u770B\u62DB\u65B0\u5C97\u4F4D ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsxs(LinkButton, { to: "/feedback", variant: "glass", size: "lg", children: [_jsx(MessageSquare, { className: "h-4 w-4" }), "\u6709\u95EE\u9898\u60F3\u95EE"] })] }), _jsxs("div", { className: "mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Dot, { tone: "success", pulse: true }), "2026 \u6625\u5B63\u62DB\u65B0\u8FDB\u884C\u4E2D"] }), _jsx("span", { className: "mono", children: "7 \u4E2A\u5C97\u4F4D \u00B7 30 \u4E2A\u540D\u989D" })] })] }), _jsx("div", { className: "grid grid-cols-2 gap-3.5", children: [
                                { k: '在展项目', v: stats.projects ?? 0, icon: Layers },
                                { k: '部门活动', v: stats.activities ?? 0, icon: CalendarDays },
                                { k: '资源文件', v: stats.resources ?? 0, icon: Download },
                                { k: '画廊影像', v: stats.galleryImages ?? 0, icon: Eye },
                            ].map((it) => (_jsxs(Glass, { tone: "thin", hover: true, className: "flex flex-col items-center p-5 text-center", children: [_jsx(it.icon, { className: "h-4 w-4 text-primary/80" }), _jsx("span", { className: "mono mt-3 text-2xl font-semibold text-foreground", children: fnum(it.v) }), _jsx("span", { className: "mt-1 text-[11px] text-muted-foreground", children: it.k })] }, it.k))) })] })] }) }));
}
