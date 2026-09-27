import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Compass,
  Download,
  Eye,
  FileText,
  Layers,
  MessageSquare,
  Rocket,
  Trophy,
  Users,
} from 'lucide-react';

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
const rise = (delay: number) => ({ animationDelay: `${delay}ms` });
/** 滚动揭示：统一的分级延迟（级差 45ms，最多累到第 6 个） */
const stagger = (i: number, step = 45) => ({ transitionDelay: `${Math.min(i, 5) * step}ms` });

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
  const { settings } = useSettings();
  const toast = useToast();
  useScrollVar();
  const active = useActiveSection(SECTIONS.map((s) => s.id));
  const dens = useDensity();

  const d = data ?? {};
  const s = d.settings ?? {};
  const stats = d.stats ?? {};

  const [newsTab, setNewsTab] = useState('all');

  const downloadResource = async (r: any) => {
    try {
      const out = await SubmitApi.downloadResource(r.id);
      if (r.url && r.url !== '#') window.open(r.url, '_blank');
      else toast.info('演示数据', '该资源为演示条目，未绑定真实文件。可在后台「资源中心」上传实际文件。');
      toast.success('开始下载', `${r.title}（${fnum(out.downloads)} 次下载）`);
    } catch (e: any) {
      toast.error('下载失败', e.message);
    }
  };

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

      {/* 下滑后浮现的背景大标识 */}
      <BrandBackdrop peakOpacity={0.42} scale={1.72} reveal={0.58} side="left" />

      <SectionRail sections={SECTIONS} active={active} />

      <Hero settings={s} />
      <QuickAbout quickCount={4} stats={stats} intro={s.intro} />
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
      <GalleryBlock images={d.gallery ?? []} loading={loading} dens={dens} />
      <ResourceBlock onDownload={downloadResource} dens={dens} />
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
    <section id="hero" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 pb-10 pt-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <GridTexture className="opacity-70" size={64} />
        <GlowOrb className="left-1/2 top-[14%] -translate-x-1/2" size={780} color="rgba(186,230,253,.12)" />
      </div>

      <OrbitalCanvas className="z-[1]" />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[80vh] w-[min(1180px,96vw)] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(ellipse 62% 52% at 50% 50%, rgba(0,0,0,.58) 0%, rgba(0,0,0,.34) 48%, transparent 76%)' }}
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
          <LogoMark uid="hero" animated spin spinDuration={28} className="relative h-[172px] w-[172px] sm:h-[214px] sm:w-[214px]" />
        </div>

        <h1
          className="st-rise text-balance text-[2.3rem] font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
          style={rise(70)}
        >
          <span className="aurora-text">科技创新部</span>
        </h1>
        <p
          className="mono st-rise mt-4 text-xs font-medium uppercase text-muted-foreground sm:text-sm"
          style={{ letterSpacing: '0.34em', ...rise(140) }}
        >
          TECHNOLOGY &amp; INNOVATION DEPARTMENT
        </p>

        {/* 标语两侧的规则线各带一道极淡流光 —— 首屏唯一的常驻动效 */}
        <div className="st-rise mt-5 flex items-center gap-4" style={rise(210)}>
          <span aria-hidden className="hidden w-14 sm:block">
            <span className="st-rule st-draw block" style={rise(560)} />
          </span>
          <p className="text-lg font-light text-foreground/80">{settings.slogan || '以技术为舟，以创新为帆'}</p>
          {/* 镜像放在外层，避免和 .st-draw 的 transform 打架 */}
          <span aria-hidden className="hidden w-14 -scale-x-100 sm:block">
            <span className="st-rule st-draw block" style={rise(560)} />
          </span>
        </div>

        <div className="st-rise mt-7 flex flex-wrap items-center justify-center gap-3" style={rise(280)}>
          <LinkButton to="/projects" variant="primary" size="lg">
            <Rocket className="h-4 w-4" />
            浏览创新项目
          </LinkButton>
          <LinkButton to="/activities" variant="glass" size="lg">
            <CalendarDays className="h-4 w-4" />
            活动报名
          </LinkButton>
        </div>
      </div>
      {/* 下滑提示 */}
      <div
        aria-hidden
        className="st-rise absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5"
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
  { icon: CalendarDays, title: '活动报名', desc: '技术沙龙 · 工作坊 · 竞赛集训', to: '/activities' },
  { icon: FileText, title: '项目申报', desc: '大创项目在线申报与进度查询', to: '/projects/apply' },
  { icon: Download, title: '资源下载', desc: '申报书模板 · 竞赛指南 · 培训资料', to: '/resources' },
  { icon: Users, title: '加入我们', desc: '招新公告 · 岗位介绍 · 报名表', to: '/join' },
];

function QuickAbout({ stats, intro }: { quickCount: number; stats: any; intro?: string }) {
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
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* 快速入口 */}
        <div className="grid grid-cols-2 gap-3.5">
          {QUICK.map((q, i) => (
            <Link key={q.to} to={q.to} data-reveal="scale" style={stagger(i)} className="group block">
              <Glass tone="soft" hover sheen className="flex h-full min-h-[124px] flex-col justify-between p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-foreground/80 transition-all duration-400 group-hover:border-primary/40 group-hover:text-primary">
                  <q.icon className="h-[17px] w-[17px]" />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-base font-medium">
                    {q.title}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" />
                  </h3>
                  <p className="clamp-2 mt-1 text-sm leading-relaxed text-muted-foreground">{q.desc}</p>
                </div>
              </Glass>
            </Link>
          ))}
        </div>

        {/* 部门概况 */}
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            {items.map((it, i) => (
              <Glass key={it.label} tone="soft" hover sheen className="p-4" data-reveal="scale" style={stagger(i)}>
                <p className="text-sm tracking-wide text-muted-foreground">{it.label}</p>
                <p className="mono mt-2 text-xl font-semibold text-primary">{it.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{it.unit}</p>
              </Glass>
            ))}
          </div>
          <Glass tone="soft" className="p-4" data-reveal style={stagger(4)}>
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
      description="从 2015 年成立至今；通知公告、部门新闻、竞赛信息与政策文件实时同步。"
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
                      <span className="mono text-sm font-semibold text-primary">{t.year}</span>
                      <span className="mt-1 h-2 w-2 rounded-full border-2 border-primary bg-background" />
                      {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />}
                    </div>
                    <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-2.5' : '')}>
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
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
    { t: '在线填写申报书', d: '项目名称、团队信息、技术路线' },
    { t: '上传支撑材料', d: '申报书 PDF、指导教师意见' },
    { t: '部门初审', d: '5 个工作日内反馈受理结果' },
    { t: '专家评审与公示', d: '结果公示，可在线查询进度' },
  ];
  const count = pick([3, 3, 4, 4], dens);

  return (
    <Screen
      id="activities"
      eyebrow="Events & Application"
      title="活动预告与项目申报"
      description="活动在线报名、名额与截止倒计时；大创项目从提交到结果公示全流程线上化。"
      action={
        <>
          <LinkButton to="/activities">
            全部活动 <ArrowRight className="h-4 w-4" />
          </LinkButton>
          <LinkButton to="/projects/apply" variant="primary">
            <FileText className="h-4 w-4" />
            立即申报
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
      title="创新成果与竞赛信息"
      description="项目展示库覆盖优秀、立项、结项与在研项目；竞赛信息聚合，倒计时提醒不错过截止。"
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
          ) : (
            <>
              {hero && (
                <div data-reveal>
                  <ProjectCard project={hero} size="sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3.5">
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
          {loading
            ? Array.from({ length: compCount }).map((_, i) => <Skeleton key={i} className="h-[150px]" />)
            : competitions.slice(0, compCount).map((c, i) => (
                <div key={c.id} data-reveal="right" style={stagger(i)}>
                  <CompetitionCard competition={c} />
                </div>
              ))}
        </div>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 6. 活动画廊（独占一屏，照片数随分辨率增加）
 * ========================================================================== */
function GalleryBlock({ images, loading, dens }: { images: any[]; loading: boolean; dens: number }) {
  const count = pick([8, 8, 12, 12], dens);

  return (
    <Screen
      id="gallery"
      eyebrow="Gallery"
      title="活动画廊"
      description="科技文化节、竞赛现场、创新工坊与讲座沙龙的影像记录。"
      action={
        <LinkButton to="/gallery">
          进入画廊 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', count > 8 && '2xl:grid-cols-6')}>
        {loading
          ? Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="aspect-[4/3]" />)
          : images.slice(0, count).map((img: any, i: number) => (
              <Link
                key={img.id}
                to="/gallery"
                data-reveal="scale"
                style={stagger(i % 6, 38)}
                className="group block"
              >
                {/* 画廊格子同样走「板中板」：裁剪只发生在 .card-media 上，
                    外壳的 5px 内衬不参与裁剪，图片边缘就不会被外圆角切出阶梯边。
                    悬浮放大交给 .card:hover .card-media img（scale 独立属性，纯合成）。 */}
                <div className="card">
                  <div className="card-media aspect-[4/3]">
                    <img src={img.url} alt={img.title} loading="lazy" />
                    <span aria-hidden className="card-scrim" />
                    <p className="clamp-1 absolute inset-x-0 bottom-0 px-3 pb-2.5 text-sm font-medium text-white/95">{img.title}</p>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 7. 资源中心（独占一屏）
 * ========================================================================== */
function ResourceBlock({ onDownload, dens }: { onDownload: (r: any) => void; dens: number }) {
  const { data, loading } = useApi<any[]>(() => PublicApi.resources(), []);
  const count = pick([6, 6, 8, 8], dens);
  const list = (data ?? []).slice(0, count);

  return (
    <Screen
      id="resources"
      eyebrow="Resources"
      title="资源中心"
      description="申报书模板、商业计划书、路演 PPT、政策文件、竞赛指南与培训资料。"
      action={
        <LinkButton to="/resources">
          全部资源 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', count > 6 && '2xl:grid-cols-4')}>
        {loading
          ? Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-40" />)
          : list.map((r, i) => (
              <div key={r.id} data-reveal="scale" style={stagger(i % 4)}>
                <ResourceCard resource={r} onDownload={onDownload} />
              </div>
            ))}
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 8. 组织架构 + 成员风采（合并一屏）
 * ========================================================================== */
function OrgMembers({ members, loading, dens }: { members: any[]; loading: boolean; dens: number }) {
  const { data, loading: orgLoading } = useApi<any>(() => PublicApi.about(), []);
  const org: any[] = data?.org ?? [];
  const memberCount = pick([8, 8, 12, 12], dens);

  return (
    <Screen
      id="org"
      eyebrow="Organization & Team"
      title="组织架构与成员风采"
      description="四个工作组协同运转，成员来自全校多个学院。"
      action={
        <LinkButton to="/about#members">
          认识全体成员 <ArrowRight className="h-4 w-4" />
        </LinkButton>
      }
    >
      <div className="flex flex-col gap-5">
        {/* 组织架构 */}
        {orgLoading ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {org.map((root) => (
              <React.Fragment key={root.id}>
                <div className="flex flex-wrap items-center gap-3" data-reveal>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-base font-medium">{root.name}</p>
                  <span className="text-sm text-muted-foreground">{root.leader}</span>
                  <Chip className="ml-auto">{(root.children ?? []).length} 个工作组</Chip>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {(root.children ?? []).map((c: any, i: number) => (
                    <Glass key={c.id} tone="thin" hover className="flex h-full flex-col p-4" data-reveal="scale" style={stagger(i)}>
                      <div className="flex items-center gap-2">
                        <Compass className="h-3.5 w-3.5 text-primary/80" />
                        <p className="text-sm font-medium">{c.name}</p>
                      </div>
                      <p className="clamp-2 mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                    </Glass>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* 成员风采 */}
        <div className={cn('grid grid-cols-2 gap-3.5 sm:grid-cols-4', memberCount > 8 && '2xl:grid-cols-6')}>
          {loading
            ? Array.from({ length: memberCount }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
            : members.slice(0, memberCount).map((m: any, i: number) => (
                <Glass
                  key={m.id}
                  tone="soft"
                  hover
                  sheen
                  className="flex flex-col items-center p-3.5 text-center"
                  data-reveal="scale"
                  style={stagger(i % 6, 38)}
                >
                  <div className="relative">
                    <LogoMark uid={`m${m.id}`} monochrome className="h-9 w-9 text-white/18" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">{m.name.slice(-2)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{m.name}</p>
                  <p className="clamp-1 mt-0.5 text-sm text-primary">{m.role}</p>
                </Glass>
              ))}
        </div>
      </div>
    </Screen>
  );
}

/* =============================================================================
 * 9. 加入我们（独占一屏）
 * ========================================================================== */
function JoinBlock({ stats }: { stats: any }) {
  return (
    <Screen id="join" container="shell">
      <Glass tone="strong" className="relative overflow-hidden p-8 sm:p-12 lg:p-14" data-reveal="scale">
        {/* 尾屏留一对错相位的呼吸光晕 —— 14s 一次、只动 opacity/scale，纯合成 */}
        <GlowOrb className="st-breathe -left-24 -top-24" size={520} color="rgba(186,230,253,.11)" />
        <GlowOrb className="st-breathe -bottom-32 -right-20" size={480} color="rgba(255,255,255,.06)" style={{ animationDelay: '-7s' }} />
        <GridTexture className="opacity-40" size={52} />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="eyebrow mb-5">Join Us</div>
            <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight">
              和我们一起，
              <br className="hidden sm:block" />
              把想法变成可运行的东西
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-[1.85] text-muted-foreground">
              无论你擅长写代码、做设计、写文案，还是单纯对某个领域充满好奇 —— 科技创新部都欢迎你。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <LinkButton to="/join" variant="primary" size="lg">
                查看招新岗位 <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton to="/feedback" variant="glass" size="lg">
                <MessageSquare className="h-4 w-4" />
                有问题想问
              </LinkButton>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Dot tone="success" pulse />
                2026 春季招新进行中
              </span>
              <span className="mono">7 个岗位 · 30 个名额</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { k: '在展项目', v: stats.projects ?? 0, icon: Layers },
              { k: '部门活动', v: stats.activities ?? 0, icon: CalendarDays },
              { k: '资源文件', v: stats.resources ?? 0, icon: Download },
              { k: '画廊影像', v: stats.galleryImages ?? 0, icon: Eye },
            ].map((it) => (
              <Glass key={it.k} tone="thin" hover className="flex flex-col items-center p-5 text-center">
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
