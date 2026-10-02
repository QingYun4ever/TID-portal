import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  FileText,
  Layers,
  MessageSquare,
  Pause,
  Play,
  Rocket,
  Trophy,
  Users,
} from 'lucide-react';

import type { GalleryImage } from '../../shared/types';
import { PublicApi } from '@/lib/api';
import { useApi, useActiveSection, useScrollVar } from '@/lib/hooks';
import { NEWS_CATEGORIES, cn, fnum, plain } from '@/lib/utils';
import { LogoMark } from '@/components/Brand';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { OrbitalCanvas } from '@/components/OrbitalCanvas';
import { ActivityCard, ArticleCard, CompetitionCard, ProjectCard } from '@/components/cards';
import { Avatar, Chip, Glass, LinkButton, Section, Skeleton, Tabs } from '@/components/ui';

/* =============================================================================
 * 首页 —— 下滑式「一屏一块」布局
 *
 * 布局约定：
 *   · 每个分区是一「屏」（<Screen> = <Section screen>），高度取 min-h 而非固定一屏：
 *     内容多就自然撑开，内容少也不会被拉成半屏空白
 *   · 相关内容合并到同一屏，共 8 屏
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
const rise = (delay: number) => ({ animationDelay: `${delay}ms` });
/** 滚动揭示：统一的分级延迟（级差 45ms，最多累到第 6 个） */
const stagger = (i: number, step = 45) => ({ transitionDelay: `${Math.min(i, 5) * step}ms` });

const SECTIONS = [
  { id: 'hero', label: '首页' },
  { id: 'quick', label: '快速入口' },
  { id: 'news', label: '历程与新闻' },
  { id: 'activities', label: '活动与报名' },
  { id: 'projects', label: '作品与竞赛' },
  { id: 'gallery', label: '活动画廊' },
  { id: 'org', label: '组织与成员' },
  { id: 'join', label: '加入我们' },
];

/** 首页专用：给每个分区一个「一屏」的下限（min-h），内容更多则自然撑开 */
function Screen(props: React.ComponentProps<typeof Section>) {
  return <Section screen {...props} />;
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
      if (w >= 1280 && h >= 800) lv = 1;
      if (w >= 1600 && h >= 900) lv = 2;
      if (w >= 1920 && h >= 1040) lv = 3;
      setLevel(lv);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return level;
}

/** 按密度等级取值 */
const pick = <T,>(arr: T[], level: number): T => arr[Math.min(arr.length - 1, Math.max(0, level))];

export default function Home() {
  const { data, loading } = useApi<any>(() => PublicApi.overview(), []);
  useScrollVar();
  const active = useActiveSection(SECTIONS.map((s) => s.id));
  const dens = useDensity();

  const d = data ?? {};
  const s = d.settings ?? {};
  const stats = d.stats ?? {};

  const [newsTab, setNewsTab] = useState('all');

  const filteredNews = useMemo(() => {
    const list: any[] = d.featuredArticles ?? [];
    return (newsTab === 'all' ? list : list.filter((a) => a.category === newsTab)).slice(0, 4);
  }, [d.featuredArticles, newsTab]);

  const catCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of d.featuredArticles ?? []) m[a.category] = (m[a.category] ?? 0) + 1;
    return m;
  }, [d.featuredArticles]);

  return (
    <>
      {/* 顶部滚动进度条 —— 进度由 --scroll-p 驱动，纯合成，不经过 React */}
      <div aria-hidden className="scroll-progress" />

      {/* 双主题轨道水印：离开首屏后浮现，始终位于正文背后。 */}
      <BrandBackdrop />

      <SectionRail sections={SECTIONS} active={active} />

      <Hero settings={s} />
      <QuickAbout stats={stats} intro={s.intro} />
      <HistoryNews
        timeline={d.timeline ?? []}
        articles={filteredNews}
        notices={d.notices ?? []}
        tab={newsTab}
        onTab={setNewsTab}
        catCount={catCount}
        loading={loading}
        dens={dens}
      />
      <ActivityApply activities={d.activities ?? []} loading={loading} dens={dens} />
      <ProjectCompetition projects={d.projects ?? []} competitions={d.competitions ?? []} loading={loading} dens={dens} />
      <GalleryBlock images={d.gallery ?? []} loading={loading} />
      <OrgMembers members={d.members ?? []} loading={loading} dens={dens} />
      <JoinBlock stats={stats} />
    </>
  );
}

/* =============================================================================
 * 右侧分区导航
 * ========================================================================== */
function SectionRail({ sections, active }: { sections: { id: string; label: string }[]; active: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <nav
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="st-fade fixed right-5 top-1/2 z-[60] hidden -translate-y-1/2 flex-col items-end gap-2.5 xl:flex"
      /* 等首屏进场走完再出现，避免和 Hero 的级联抢注意力 */
      style={{ animationDelay: '1050ms' }}
    >
      {sections.map((sec) => {
        const isActive = active === sec.id;
        return (
          <a key={sec.id} href={`#${sec.id}`} className="group flex items-center gap-3" aria-label={sec.label}>
            <span
              className={cn(
                'whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-all duration-300',
                hovered || isActive ? 'opacity-100' : 'translate-x-1 opacity-0',
                isActive
                  ? 'border-primary/40 bg-primary/12 text-primary'
                  : 'border-white/10 bg-black/45 text-muted-foreground backdrop-blur-md'
              )}
            >
              {sec.label}
            </span>
            <span
              className={cn(
                'block rounded-full transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)]',
                isActive ? 'h-[18px] w-[3px] bg-primary shadow-[0_0_10px_hsl(var(--primary)/.9)]' : 'h-[5px] w-[3px] bg-white/22 group-hover:bg-white/45'
              )}
            />
          </a>
        );
      })}
    </nav>
  );
}

/* =============================================================================
 * 1. 首屏
 * ========================================================================== */
function Hero({ settings }: { settings: Record<string, string> }) {
  return (
    <section id="hero" className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden pb-8 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pt-[calc(var(--nav-h)+1.5rem)] lg:min-h-dvh lg:pb-10 lg:pt-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <GridTexture className="opacity-70" size={64} />
        <GlowOrb className="left-1/2 top-[14%] -translate-x-1/2" size={780} color="rgba(186,230,253,.12)" />
      </div>

      <OrbitalCanvas className="z-[1]" />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[80vh] w-[min(1180px,96vw)] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(ellipse 62% 52% at 50% 50%, rgb(var(--tw-black) / .58) 0%, rgb(var(--tw-black) / .34) 48%, transparent 76%)' }}
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <div className="st-rise relative mb-5" style={rise(0)}>
          <div
            aria-hidden
            className="st-breathe absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(186,230,253,.19) 0%, rgba(186,230,253,.10) 30%, rgba(186,230,253,.03) 52%, transparent 72%)',
            }}
          />
          <LogoMark uid="hero" animated spin spinDuration={28} className="relative h-36 w-36 sm:h-[214px] sm:w-[214px]" />
        </div>

        <h1
          className="st-rise text-balance text-[2.1rem] font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
          style={rise(70)}
        >
          <span className="aurora-text">科技创新部</span>
        </h1>
        <p
          className="mono st-rise mt-4 max-w-full text-balance text-xs font-medium uppercase leading-relaxed tracking-[0.14em] text-muted-foreground sm:text-sm sm:leading-normal sm:tracking-[0.34em]"
          style={rise(140)}
        >
          TECHNOLOGY &amp; INNOVATION DEPARTMENT
        </p>

        {/* 标语两侧的规则线各带一道极淡流光 —— 首屏唯一的常驻动效 */}
        <div className="st-rise mt-5 flex max-w-full items-center gap-4" style={rise(210)}>
          <span aria-hidden className="hidden w-14 sm:block">
            <span className="st-rule st-draw block" style={rise(560)} />
          </span>
          <p className="min-w-0 break-words text-base font-light text-foreground/80 sm:text-lg">{settings.slogan || '以技术为舟，以创新为帆'}</p>
          {/* 镜像放在外层，避免和 .st-draw 的 transform 打架 */}
          <span aria-hidden className="hidden w-14 -scale-x-100 sm:block">
            <span className="st-rule st-draw block" style={rise(560)} />
          </span>
        </div>

        <div className="st-rise mt-7 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap" style={rise(280)}>
          <LinkButton to="/projects" variant="primary" size="lg" className="w-full sm:w-auto">
            <Rocket className="h-4 w-4" />
            浏览科技作品
          </LinkButton>
          <LinkButton to="/activities" variant="glass" size="lg" className="w-full sm:w-auto">
            <CalendarDays className="h-4 w-4" />
            活动报名
          </LinkButton>
        </div>
      </div>
      {/* 下滑提示 */}
      <div
        aria-hidden
        className="st-rise relative mt-8 flex shrink-0 flex-col items-center gap-2.5 lg:absolute lg:bottom-7 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2"
        style={rise(900)}
      >
        <span className="mono text-xs tracking-[0.3em] text-muted-foreground">SCROLL</span>
        <span className="scroll-cue-line block h-9 w-px bg-white/10" />
      </div>
    </section>
  );
}

/* =============================================================================
 * 2. 快速入口 + 部门概况（合并一屏）
 * ========================================================================== */
const QUICK = [
  { icon: CalendarDays, title: '活动报名', desc: '科普讲座 · 科技比赛 · 科技活动', to: '/activities' },
  { icon: FileText, title: '比赛报名', desc: '科技比赛与活动在线报名', to: '/projects/apply' },
  { icon: Trophy, title: '竞赛信息', desc: '赛事动态 · 报名与截止时间', to: '/competitions' },
  { icon: Users, title: '加入我们', desc: '查看录取名单 · 联系部门', to: '/join' },
];

function CrtPanel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const screen = screenRef.current;
    if (!host || !screen) return;
    const media = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let bounds: DOMRect | null = null;
    let frame = 0;
    let lastTime = 0;
    let x = 2;
    let y = -4;
    let targetX = x;
    let targetY = y;
    let velocityX = 0;
    let velocityY = 0;

    const paint = () => {
      screen.style.transform = `perspective(1000px) rotateX(${x}deg) rotateY(${y}deg)`;
    };
    const tick = (time: number) => {
      frame = 0;
      const dt = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;
      // Unit-mass spring: stiffness 100, damping 10. No React renders per frame.
      velocityX += ((targetX - x) * 100 - velocityX * 10) * dt;
      velocityY += ((targetY - y) * 100 - velocityY * 10) * dt;
      x += velocityX * dt;
      y += velocityY * dt;
      if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(velocityX) + Math.abs(velocityY) < 0.02) {
        x = targetX;
        y = targetY;
        velocityX = velocityY = 0;
        paint();
        return;
      }
      paint();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!frame && media.matches && !document.hidden) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return;
      bounds ??= host.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / (bounds.width || 1)) * 2 - 1));
      const py = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / (bounds.height || 1)) * 2 - 1));
      targetX = -py * 10;
      targetY = px * 14;
      start();
    };
    const leave = () => {
      bounds = null;
      targetX = 2;
      targetY = -4;
      start();
    };
    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      x = targetX = 2;
      y = targetY = -4;
      velocityX = velocityY = 0;
      screen.style.removeProperty('transform');
    };
    const visibility = () => { if (document.hidden) reset(); };
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointercancel', leave);
    window.addEventListener('scroll', leave, { passive: true });
    window.addEventListener('resize', leave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', reset);
    return () => {
      reset();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointercancel', leave);
      window.removeEventListener('scroll', leave);
      window.removeEventListener('resize', leave);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', reset);
    };
  }, []);

  return (
    <div ref={hostRef} className="home-crt">
      <div ref={screenRef} className="home-crt-screen">
        <img
          src="/tid-crt.svg"
          alt="TID — Technology Innovation DEPT. 部门介绍终端"
          width={720}
          height={405}
          loading="lazy"
          className="block h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}

function QuickAbout({ stats, intro }: { stats: { projects?: number; members?: number }; intro?: string }) {
  const items = [
    { label: '在展项目', value: String(stats.projects ?? 0), unit: '项' },
    { label: '部门成员', value: String(stats.members ?? 0), unit: '人' },
  ];
  const duties = [
    '面向全校开展科技知识科普，普及科学常识与前沿科技',
    '策划并组织校内科技比赛与科技活动',
    '运营部门门户网站，发布科普内容与活动信息',
    '配合学校开展科技教育相关活动',
  ];

  return (
    <Screen
      id="quick"
      eyebrow="Portal & About"
      title="快速入口与部门概况"
      description={intro ? plain(intro, 108) : undefined}
      action={
        <LinkButton to="/about">
          了解部门全貌 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] xl:grid-cols-[minmax(0,1fr)_720px]">
        {/* 快速入口 */}
        <div className="flex min-w-0 flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3.5">
          {QUICK.map((q, i) => (
            <Link key={q.to} to={q.to} data-reveal="scale" style={stagger(i)} className="group block">
              <Glass tone="thin" hover refract={false} className="home-float flex h-full min-h-[124px] flex-col justify-between p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-foreground/80 group-hover:border-primary/40 group-hover:text-primary">
                  <q.icon className="h-[17px] w-[17px]" />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-base font-medium">
                    {q.title}
                    <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-80" />
                  </h3>
                  <p className="clamp-2 mt-1 text-sm leading-relaxed text-muted-foreground">{q.desc}</p>
                </div>
              </Glass>
            </Link>
          ))}
        </div>
          <div className="grid grid-cols-2 gap-3.5">
            {items.map((it, i) => (
              <Glass key={it.label} tone="thin" hover refract={false} className="home-float p-4" data-reveal="scale" style={stagger(i)}>
                <p className="text-sm tracking-wide text-muted-foreground">{it.label}</p>
                <p className="mono mt-2 text-xl font-semibold text-primary">{it.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{it.unit}</p>
              </Glass>
            ))}
          </div>
        </div>

        {/* 部门概况 */}
        <CrtPanel />
          <Glass tone="soft" className="p-4 lg:col-span-2" data-reveal style={stagger(4)}>
            <h3 className="text-base font-medium">核心职责</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {duties.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
                  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </Glass>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 3. 发展历程 + 新闻与通知（合并一屏）
 * ========================================================================== */
function HistoryNews({
  timeline,
  articles,
  notices,
  tab,
  onTab,
  catCount,
  loading,
  dens,
}: {
  timeline: any[];
  articles: any[];
  notices: any[];
  tab: string;
  onTab: (v: string) => void;
  catCount: Record<string, number>;
  loading: boolean;
  dens: number;
}) {
  const tabs = [
    { value: 'all', label: '全部' },
    ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label, count: catCount[value] })),
  ];
  const first = articles[0];
  const timelineCount = pick([6, 6, 7, 7], dens);

  return (
    <Screen
      id="news"
      eyebrow="Milestones & News"
      title="发展历程与新闻通知"
      description="通知公告、部门新闻、竞赛信息与政策文件实时同步。"
      action={
        <LinkButton to="/news">
          全部内容 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        {/* 发展历程 */}
        <Glass tone="soft" className="flex flex-col p-5" data-reveal="left">
          <h3 className="mb-3.5 flex items-center gap-2.5 text-[14.5px] font-medium">
            <Compass className="h-4 w-4 text-primary" />
            发展历程
          </h3>
          <div className="flex flex-1 flex-col">
            {timeline.length === 0
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mb-2 h-10" />)
              : timeline.slice(0, timelineCount).map((t, i, arr) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="flex w-10 shrink-0 flex-col items-center">
                      <span className="mono min-h-5 text-sm font-semibold text-primary">{arr.findIndex((item) => item.year === t.year) === i ? t.year : null}</span>
                      <span className="mt-1 h-2 w-2 rounded-full border-2 border-primary bg-background" />
                      {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />}
                    </div>
                    <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-2.5' : '')}>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {t.dateLabel && <span className="mono shrink-0 text-xs text-muted-foreground">{t.dateLabel}</span>}
                        <p className="min-w-0 text-sm font-medium leading-snug">{t.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
          <Link to="/about" className="mt-3 text-sm text-primary transition hover:underline">
            查看完整历程 →
          </Link>
        </Glass>

        {/* 新闻与通知 */}
        <div className="flex flex-col gap-3.5">
          <div data-reveal>
            <Tabs items={tabs} value={tab} onChange={onTab} size="sm" />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-[1.1fr_1fr]">
            {loading ? (
              <Skeleton className="h-[210px]" />
            ) : first ? (
              /* 头条直接复用 ArticleCard 的 featured 形态 ——
                 原来这里是一张自绘的 Glass + overflow-hidden 卡：
                 外壳同时承担圆角、裁剪与毛玻璃，正是封面边缘出现阶梯锯齿的写法。 */
              <div data-reveal>
                <ArticleCard article={first} featured />
              </div>
            ) : (
              <Glass tone="soft" className="p-8 text-center text-sm text-muted-foreground">
                该分类下暂无内容
              </Glass>
            )}

            <Glass tone="soft" className="p-4" data-reveal="right">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-medium">
                  <Bell className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  通知公告
                </h3>
                <Link to="/news?category=notice" className="text-sm text-primary transition hover:underline">
                  更多
                </Link>
              </div>
              <div className="flex flex-col gap-0.5">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)
                  : notices.slice(0, pick([4, 4, 5, 5], dens)).map((n) => <ArticleCard key={n.id} article={n} compact />)}
                {!loading && !notices.length && <p className="py-5 text-center text-xs text-muted-foreground">暂无通知</p>}
              </div>
            </Glass>
          </div>
        </div>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 4. 活动预告 + 项目申报（合并一屏）
 * ========================================================================== */
function ActivityApply({ activities, loading, dens }: { activities: any[]; loading: boolean; dens: number }) {
  const steps = [
    { t: '在线报名', d: '比赛 / 活动名称、年级班级、联系方式' },
    { t: '提交材料', d: '报名表与必要材料（如需）' },
    { t: '部门初审', d: '5 个工作日内反馈结果' },
    { t: '结果公示', d: '结果公示，可在线查询' },
  ];
  const count = pick([3, 3, 4, 4], dens);

  return (
    <Screen
      id="activities"
      eyebrow="Events & Application"
      title="活动预告与比赛报名"
      description="活动与比赛在线报名、名额与截止倒计时；从报名到结果公示全流程线上化。"
      action={
        <>
          <LinkButton to="/activities">
            全部活动 <ArrowRight className="h-4 w-4" />
          </LinkButton>
          <LinkButton to="/projects/apply" variant="primary">
            <FileText className="h-4 w-4" />
            立即报名
          </LinkButton>
        </>
      }
    >
      <div className={cn('grid gap-4', count >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {loading
          ? Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-[236px]" />)
          : activities.slice(0, count).map((a, i) => (
              <div key={a.id} data-reveal="scale" style={stagger(i)}>
                <ActivityCard activity={a} />
              </div>
            ))}
        {!loading && !activities.length && (
          <Glass tone="soft" className="p-8 text-center text-sm text-muted-foreground lg:col-span-3">
            近期暂无活动，敬请关注后续通知
          </Glass>
        )}
      </div>

      {/* 申报流程 */}
      <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Glass key={step.t} tone="soft" hover sheen className="flex items-start gap-3 p-4" data-reveal="scale" style={stagger(i)}>
            <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-medium">{step.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
            </div>
          </Glass>
        ))}
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 5. 创新成果 + 竞赛信息（合并一屏）
 * ========================================================================== */
function ProjectCompetition({
  projects,
  competitions,
  loading,
  dens,
}: {
  projects: any[];
  competitions: any[];
  loading: boolean;
  dens: number;
}) {
  const hero = projects[0];
  const rest = projects.slice(1, pick([2, 2, 3, 3], dens));
  const compCount = pick([2, 2, 2, 3], dens);

  return (
    <Screen
      id="projects"
      eyebrow="Showcase & Competitions"
      title="科技作品与竞赛信息"
      description="展示部门与同学的科技作品；竞赛日历同步提醒报名截止。"
      action={
        <>
          <LinkButton to="/projects">
            项目展示库 <ArrowRight className="h-4 w-4" />
          </LinkButton>
          <LinkButton to="/competitions">
            <Trophy className="h-4 w-4" />
            竞赛日历
          </LinkButton>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* 创新成果 */}
        <div className="flex flex-col gap-3.5">
          {loading ? (
            <>
              <Skeleton className="h-[210px]" />
              <div className="grid grid-cols-2 gap-3.5">
                <Skeleton className="h-[130px]" />
                <Skeleton className="h-[130px]" />
              </div>
            </>
          ) : !projects.length ? (
            <Glass tone="soft" className="flex min-h-[210px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              项目展示库暂无内容，敬请期待
            </Glass>
          ) : (
            <>
              {hero && (
                <div data-reveal>
                  <ProjectCard project={hero} size="sm" />
                </div>
              )}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {rest.map((p, i) => (
                  <div key={p.id} data-reveal="scale" style={stagger(i)}>
                    <ProjectCard project={p} size="sm" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 竞赛信息 */}
        <div className="flex flex-col gap-3.5">
          {loading ? (
            Array.from({ length: compCount }).map((_, i) => <Skeleton key={i} className="h-[150px]" />)
          ) : !competitions.length ? (
            <Glass tone="soft" className="flex min-h-[150px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              暂无竞赛信息，敬请期待
            </Glass>
          ) : (
            competitions.slice(0, compCount).map((c, i) => (
              <div key={c.id} data-reveal="right" style={stagger(i)}>
                <CompetitionCard competition={c} />
              </div>
            ))
          )}
        </div>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 6. 活动画廊（层叠轮播）
 * ========================================================================== */
function GalleryBlock({ images, loading }: { images: GalleryImage[]; loading: boolean }) {
  const gallery = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = images.length;
  const current = count ? active % count : 0;
  const playing = count > 1 && !loading && !paused && !hovered && visible && pageVisible && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPaused(true);
    };
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: 0.25 });
    if (gallery.current) observer.observe(gallery.current);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setActive((index) => count ? index % count : 0);
  }, [count]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % count), 5000);
    return () => window.clearInterval(timer);
  }, [playing, count]);

  const select = (index: number) => {
    if (!count) return;
    setPaused(true);
    setActive((index + count) % count);
  };

  return (
    <Screen
      id="gallery"
      eyebrow="Gallery"
      title="活动画廊"
      description="影像在此展开。自动轮播，可暂停细看，也可滑动或使用箭头切换。"
      action={<LinkButton to="/gallery">进入画廊 <ArrowRight className="h-4 w-4" /></LinkButton>}
    >
      <div
        ref={gallery}
        className="home-gallery"
        role="region"
        aria-label="活动影像"
        aria-roledescription="轮播图"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(true);
        }}
      >
        {loading ? (
          <Skeleton className="home-gallery-stage w-full" />
        ) : count ? (
          <>
            <div
              className="home-gallery-stage"
              tabIndex={0}
              aria-label="图片展示，左右方向键切换"
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  select(current + (event.key === 'ArrowLeft' ? -1 : 1));
                }
              }}
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                setPaused(true);
                suppressClick.current = false;
                gesture.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = gesture.current;
                gesture.current = null;
                if (!start) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                  suppressClick.current = true;
                  select(current + (dx < 0 ? 1 : -1));
                }
              }}
              onPointerCancel={() => { gesture.current = null; }}
              onClickCapture={(event) => {
                if (!suppressClick.current) return;
                event.preventDefault();
                event.stopPropagation();
                suppressClick.current = false;
              }}
            >
              {images.map((image, index) => {
                let offset = (index - current + count) % count;
                if (offset > count / 2) offset -= count;
                const position = Math.max(-2, Math.min(2, offset));
                const selected = offset === 0;
                return (
                  <div
                    key={image.id}
                    className="home-gallery-slide"
                    data-position={position}
                    aria-hidden={!selected}
                    role="group"
                    aria-roledescription="幻灯片"
                    aria-label={`${index + 1} / ${count}: ${image.title}`}
                  >
                    <img src={image.url} alt={selected ? image.title : ''} loading={Math.abs(offset) <= 1 ? 'eager' : 'lazy'} draggable={false} />
                    {!selected && Math.abs(offset) === 1 && (
                      <button type="button" tabIndex={-1} className="home-gallery-preview" onClick={() => select(index)} aria-label={`查看${image.title}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="home-gallery-toolbar">
              <div className="min-w-0" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
                <p className="truncate text-sm font-medium">{images[current].title}</p>
                <p className="mono mt-1 text-xs tabular-nums text-muted-foreground">{current + 1} / {count}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {count > 1 && !reducedMotion && (
                  <button type="button" className="home-gallery-control gap-2 px-3.5" onClick={() => setPaused((value) => !value)} aria-label={paused ? '继续自动轮播' : '暂停自动轮播'}>
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    <span className="text-xs">{paused ? '继续' : '暂停'}</span>
                  </button>
                )}
                <button type="button" className="home-gallery-control" onClick={() => select(current - 1)} disabled={count < 2} aria-label="上一张"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" className="home-gallery-control" onClick={() => select(current + 1)} disabled={count < 2} aria-label="下一张"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
          </>
        ) : (
          <Glass tone="soft" className="p-8 text-center text-sm text-muted-foreground">暂无活动影像</Glass>
        )}
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 7. 组织架构 + 成员风采（合并一屏）
 *
 * 布局：左边一张「组织架构」窄卡，右边是成员网格。
 * 之前是上下两段 —— 架构那段在只有一个根节点、又没有子工作组的时候会塌成一行字，
 * 底下再跟一个空的四列网格，整屏看下来就是一片空白。改成左右分栏之后两边互相撑着，
 * 数据多少都不会塌。
 * ========================================================================== */

/** org_nodes.leader 存的是「部长 庄梓翔」这种「职务 + 姓名」串，拆开分两行显示 */
function splitLeader(raw?: string | null) {
  const s = String(raw ?? '').trim();
  if (!s) return { title: '', name: '' };
  const parts = s.split(/\s+/);
  return parts.length > 1
    ? { title: parts.slice(0, -1).join(' '), name: parts[parts.length - 1] }
    : { title: '', name: s };
}

function OrgMembers({ members, loading, dens }: { members: any[]; loading: boolean; dens: number }) {
  const { data, loading: orgLoading } = useApi<any>(() => PublicApi.about(), []);
  const org: any[] = data?.org ?? [];
  const memberCount = pick([6, 9, 12, 16], dens);

  return (
    <Screen
      id="org"
      eyebrow="Organization & Team"
      title="组织架构与成员风采"
      description="部长团与学生成员共同参与部门工作。"
      action={
        <LinkButton to="/about#members">
          认识全体成员 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
        {/* ---------------------------- 左：组织架构 ---------------------------- */}
        {orgLoading ? (
          <Skeleton className="h-[240px]" />
        ) : (
          <Glass tone="soft" className="flex flex-col gap-5 p-5" data-reveal="left">
            <div className="flex items-center gap-2.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="eyebrow">Structure</span>
            </div>

            {org.length ? (
              org.map((root: any) => {
                const leader = splitLeader(root.leader);
                const groups: any[] = root.children ?? [];
                return (
                  <div key={root.id} className="flex flex-col gap-4">
                    {/* 负责人：头像 + 姓名 + 职务，三段分开，不再挤成一行灰字 */}
                    <div className="flex items-center gap-3.5">
                      <Avatar name={leader.name || root.name} size={46} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium leading-tight">{leader.name || root.name}</p>
                        <p className="mt-1 truncate text-sm text-primary">{leader.title || root.name}</p>
                      </div>
                    </div>

                    {root.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{root.description}</p>
                    )}

                    {groups.length > 0 && (
                      <>
                        <div className="hairline" />
                        <div className="flex flex-col gap-3">
                          {groups.map((c: any) => (
                            <div key={c.id} className="flex items-start gap-2.5">
                              <Compass className="mt-[3px] h-3.5 w-3.5 shrink-0 text-primary/75" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{c.name}</p>
                                {c.description && (
                                  <p className="clamp-2 mt-0.5 text-sm leading-relaxed text-muted-foreground">
                                    {c.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">组织架构信息待补充。</p>
            )}
          </Glass>
        )}

        {/* ---------------------------- 右：成员风采 ---------------------------- */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">Members</span>
            {!loading && members.length > 0 && (
              <Chip>{Math.min(memberCount, members.length)} / {members.length}</Chip>
            )}
          </div>

          {/* 横排卡片：头像在左、姓名职务在右 —— 比居中竖排更好扫，一行也能多塞一个 */}
          <div className="grid gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4">
            {loading
              ? Array.from({ length: memberCount }).map((_, i) => <Skeleton key={i} className="h-[66px]" />)
              : members.slice(0, memberCount).map((m: any, i: number) => (
                  <Glass
                    key={m.id}
                    tone="thin"
                    hover
                    sheen
                    className="flex items-center gap-3 p-3"
                    data-reveal="scale"
                    style={stagger(i % 6, 38)}
                  >
                    <Avatar name={m.name} src={m.avatar} size={38} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="clamp-1 mt-0.5 text-sm text-primary">{m.role}</p>
                    </div>
                  </Glass>
                ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 8. 加入我们（尾屏）
 * ========================================================================== */
function JoinBlock({ stats }: { stats: { projects?: number; activities?: number; competitions?: number; galleryImages?: number } }) {
  return (
    <Screen id="join" container="shell">
      <Glass tone="strong" className="relative overflow-hidden p-5 sm:p-12 lg:p-14" data-reveal="scale">
        {/* 尾屏留一对错相位的呼吸光晕 —— 14s 一次、只动 opacity/scale，纯合成 */}
        <GlowOrb className="st-breathe -left-24 -top-24" size={520} color="rgba(186,230,253,.11)" />
        <GlowOrb className="st-breathe -bottom-32 -right-20" size={480} color="rgb(var(--orb) / .06)" style={{ animationDelay: '-7s' }} />
        <GridTexture className="opacity-40" size={52} />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="eyebrow mb-5">Join Us</div>
            <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight">加入我们</h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-[1.85] text-muted-foreground">
              查看科技创新部录取名单，了解最新录取信息。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <LinkButton to="/join" variant="primary" size="lg" className="w-full sm:w-auto">
                查看录取名单 <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton to="/feedback" variant="glass" size="lg" className="w-full sm:w-auto">
                <MessageSquare className="h-4 w-4" />
                有问题想问
              </LinkButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { k: '在展项目', v: stats.projects ?? 0, icon: Layers },
              { k: '部门活动', v: stats.activities ?? 0, icon: CalendarDays },
              { k: '竞赛信息', v: stats.competitions ?? 0, icon: Trophy },
              { k: '画廊影像', v: stats.galleryImages ?? 0, icon: Eye },
            ].map((it) => (
              <Glass key={it.k} tone="thin" hover refract={false} className="home-float flex min-w-0 flex-col items-center p-3 text-center sm:p-5">
                <it.icon className="h-4 w-4 text-primary/80" />
                <span className="mono mt-3 text-2xl font-semibold text-foreground">{fnum(it.v)}</span>
                <span className="mt-1 text-sm text-muted-foreground">{it.k}</span>
              </Glass>
            ))}
          </div>
        </div>
      </Glass>
    </Screen>
  );
}
