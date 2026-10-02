import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Award,
  CalendarDays,
  Clock,
  Compass,
  Layers,
  Quote,
  Target,
  Users,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useCountUp, useInView, useTitle } from '@/lib/hooks';
import { useSettings } from '@/lib/store';
import { fnum } from '@/lib/utils';
import { TimelineItem } from '@/components/cards';
import { useRevealScope } from '@/components/RevealScope';
import { GridTexture } from '@/components/LiquidBackdrop';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  PageHero,
  Section,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 部门概况 — /about
 * 顺序：PageHero → 部门简介 → 数据统计 → 发展历程
 *       → 指导老师(#advisors) → 成员风采(#members)
 * ========================================================================== */

const ANCHORS = [
  { id: 'intro', label: '部门简介' },
  { id: 'stats', label: '数据统计' },
  { id: 'timeline', label: '发展历程' },
  { id: 'advisors', label: '指导老师' },
  { id: 'members', label: '成员风采' },
];

export default function About() {
  useTitle('部门概况');
  const revealRef = useRevealScope<HTMLDivElement>();
  const { data, loading, error, reload } = useApi<any>(() => PublicApi.about(), []);
  const { settings } = useSettings();

  const page = data?.page ?? null;
  const timeline: any[] = data?.timeline ?? [];
  const members: any[] = data?.members ?? [];
  const stats = data?.stats ?? {};

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="About the Department"
        title={settings.deptName || '科技创新部'}
        description={settings.slogan || '以技术为舟，以创新为帆'}
        breadcrumb={[{ label: '部门概况' }]}
      >
        <p className="max-w-3xl text-pretty text-[14.5px] leading-[1.9] text-muted-foreground">
          {settings.intro ||
            '科技创新部是校级学生会的科技部门，由校团委领导，负责面向全校开展科技知识科普，并策划、组织科技比赛与科技活动。'}
        </p>

        {/* 锚点导航 */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {ANCHORS.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[11.5px] text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
            >
              {a.label}
            </a>
          ))}
        </nav>
      </PageHero>

      {error ? (
        <div className="shell pb-24">
          <Glass tone="soft" className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </Glass>
        </div>
      ) : (
        <>
          {/* ========================= 部门简介 ========================= */}
          <Section
            id="intro"
            eyebrow="Profile"
            title="部门简介"
            description="从科技知识科普到科技比赛策划，我们让每一步都清晰可参与。"
          >
            {loading ? (
              <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                <Skeleton className="h-[420px]" />
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
                <Glass tone="soft" className="p-6 sm:p-9" data-reveal="left">
                  {page?.content ? (
                    <div className="prose-glass" dangerouslySetInnerHTML={{ __html: page.content }} />
                  ) : (
                    <EmptyState
                      icon={<Layers className="h-6 w-6" />}
                      title="部门简介尚未发布"
                      description="管理员可在后台「部门概况」中维护这段介绍内容。"
                    />
                  )}
                </Glass>

                <div className="flex flex-col gap-5">
                  <Glass tone="soft" className="relative overflow-hidden p-6" data-reveal="right">
                    <GridTexture className="opacity-40" size={40} />
                    <div className="relative">
                      <Quote className="h-4 w-4 text-accent" />
                      <p className="mt-4 text-[14px] leading-[1.9] text-foreground/85">
                        「科学不只属于少数人，它可以从一次好奇开始。」
                      </p>
                      <p className="mono mt-4 text-[11px] text-muted-foreground">— 部门工作理念</p>
                    </div>
                  </Glass>

                  {[
                    {
                      icon: Target,
                      title: '降低参与门槛',
                      desc: '把分散的科技知识、零散的比赛信息整理成清晰可参与的科普与活动路径。',
                    },
                    {
                      icon: Users,
                      title: '服务全体同学',
                      desc: '无论你来自哪个年级、哪个班级，只要对科技感兴趣，都能在这里找到伙伴。',
                    },
                    {
                      icon: Award,
                      title: '兴趣为先',
                      desc: '以科普活动与科技比赛为抓手，让每次参与都有实实在在的收获。',
                    },
                  ].map((c, i) => (
                    <Glass
                      key={c.title}
                      tone="soft"
                      hover
                      sheen
                      className="p-5"
                      data-reveal="right"
                      style={{ transitionDelay: `${i * 70}ms` }}
                    >
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary">
                          <c.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium">{c.title}</p>
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{c.desc}</p>
                        </div>
                      </div>
                    </Glass>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ========================= 数据统计 ========================= */}
          <Section
            id="stats"
            eyebrow="By the Numbers"
            title="数据统计"
          >
            {loading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[136px]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <CountCard
                  icon={<Users className="h-4 w-4" />}
                  label="部门成员"
                  value={Number(stats.members ?? members.length ?? 0)}
                  unit="人"
                  hint="含部长团与学生成员"
                  delay={0}
                />
                <CountCard
                  icon={<Layers className="h-4 w-4" />}
                  label="在展项目"
                  value={Number(stats.projects ?? 0)}
                  unit="项"
                  hint="展示中的部门与同学作品"
                  delay={70}
                />
                <CountCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="年度活动"
                  value={Number(stats.activities ?? 0)}
                  unit="场"
                  hint="科普讲座 · 科技比赛 · 科技活动"
                  delay={140}
                />
                <CountCard
                  icon={<Compass className="h-4 w-4" />}
                  label="成立时间"
                  value={2026}
                  unit="年"
                  hint="2026 年 9 月成立"
                  delay={210}
                />
              </div>
            )}
          </Section>

          {/* ========================= 发展历程 ========================= */}
          <Section
            id="timeline"
            eyebrow="Milestones"
            title="发展历程"
            description="部门大事记，每一步都记录在案。"
          >
            {loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : timeline.length ? (
              <div className="relative max-w-3xl">
                {timeline.map((t, i) => (
                  <TimelineItem key={t.id} node={t} index={i} total={timeline.length} showYear={timeline.findIndex((item) => item.year === t.year) === i} />
                ))}
              </div>
            ) : (
              <Glass tone="soft" className="p-4">
                <EmptyState
                  icon={<Clock className="h-6 w-6" />}
                  title="暂无发展历程记录"
                  description="后台「发展历程」中新增条目后会在这里按年份展示。"
                />
              </Glass>
            )}
          </Section>

          {/* ========================= 指导老师 ========================= */}
          <Section id="advisors" eyebrow="Our Advisors" title="指导老师">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {['郭松梅', '杨秋静', '孙博轩', '王非凡'].map((name) => (
                <Glass key={name} tone="soft" hover sheen className="flex items-center gap-4 p-5" data-reveal="scale">
                  {/* 四个人用同一个 Users 图标等于没画头像，换成按姓名生成的 identicon */}
                  <Avatar name={name} size={46} />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-foreground">{name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">指导老师</p>
                  </div>
                </Glass>
              ))}
            </div>
          </Section>

          {/* ========================= 成员风采 ========================= */}
          <MembersSection members={members} loading={loading} />
        </>
      )}
    </div>
  );
}

/* =============================================================================
 * 数据统计卡（滚动到就播的数字动画）
 * ========================================================================== */
function CountCard({
  icon,
  label,
  value,
  unit,
  hint,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  hint: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const n = useCountUp(value, 1600, inView);

  return (
    <div ref={ref} data-reveal="scale" style={{ transitionDelay: `${delay}ms` }}>
      <Glass tone="soft" hover sheen className="flex h-full flex-col p-5 sm:p-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/28 bg-primary/12 text-primary">
          {icon}
        </span>
        <div className="mono mt-4 flex items-baseline gap-1.5 text-[2rem] font-semibold tabular-nums text-foreground">
          {fnum(Math.round(n))}
          <span className="text-[12px] font-normal text-muted-foreground">{unit}</span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-foreground/90">{label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      </Glass>
    </div>
  );
}

/* =============================================================================
 * 成员风采（按 group 筛选）
 * ========================================================================== */
function MembersSection({ members, loading }: { members: any[]; loading: boolean }) {
  const [group, setGroup] = useState('all');

  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const m of members) {
      const g = String(m.group || '其他');
      if (!seen.includes(g)) seen.push(g);
    }
    return seen;
  }, [members]);

  const items = useMemo(
    () => (group === 'all' ? members : members.filter((m) => String(m.group || '其他') === group)),
    [members, group]
  );

  const tabs = [
    { value: 'all', label: '全部', count: members.length },
    ...groups.map((g) => ({ value: g, label: g, count: members.filter((m) => String(m.group || '其他') === g).length })),
  ];

  return (
    <Section
      id="members"
      eyebrow="Our People"
      title="成员风采"
      description="部长团与学生成员共同组成科技创新部。"
      action={
        !loading && groups.length > 1 ? (
          <Tabs items={tabs} value={group} onChange={setGroup} size="sm" className="hidden sm:block" />
        ) : undefined
      }
    >
      {!loading && groups.length > 1 && (
        <div className="mb-8 no-scrollbar -mx-1 overflow-x-auto px-1 sm:hidden">
          <Tabs items={tabs} value={group} onChange={setGroup} size="sm" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[208px]" />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m, i) => (
            <div key={m.id} data-reveal="scale" style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
              <Glass tone="soft" hover sheen className="flex h-full flex-col items-center p-5 text-center">
                {/* 没传头像就走 Avatar 内置的 identicon —— 原先是拿部门 logo 当底、
                    再把名字最后两个字压在上面，图案和文字互相糊 */}
                <Avatar name={m.name} src={m.avatar} size={52} />
                <p className="mt-3.5 text-base font-medium">{m.name}</p>
                <p className="mt-1 text-sm text-primary">{m.role}</p>
                {m.group && <p className="mt-1 text-xs text-muted-foreground">{m.group}</p>}
                {m.bio && <p className="clamp-2 mt-2.5 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>}
                {Array.isArray(m.tags) && m.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {m.tags.slice(0, 3).map((t: string) => (
                      <Chip key={t} className="!px-2 !py-0 !text-[10px]">
                        {t}
                      </Chip>
                    ))}
                  </div>
                )}
              </Glass>
            </div>
          ))}
        </div>
      ) : (
        <Glass tone="soft" className="p-4">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="该分组暂无成员"
            description="切换其他分组，或等待后台补充成员信息。"
            action={
              group !== 'all' ? (
                <Button onClick={() => setGroup('all')}>查看全部成员</Button>
              ) : undefined
            }
          />
        </Glass>
      )}

      <p className="mono mt-6 text-center text-sm text-muted-foreground">
        当前展示 {items.length} / {members.length} 位成员
      </p>
    </Section>
  );
}

