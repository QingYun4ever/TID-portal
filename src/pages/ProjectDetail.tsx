import React from 'react';
import { useParams } from 'react-router';
import {
  AlertTriangle,
  Award,
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Layers,
  Sparkles,
  Tag as TagIcon,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, cn, fdate, fnum } from '@/lib/utils';
import { ProjectCard } from '@/components/cards';
import { GlowOrb } from '@/components/LiquidBackdrop';
import {
  Avatar,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  PageHero,
  Skeleton,
} from '@/components/ui';

/* =============================================================================
 * 项目详情（/projects/:slug）
 *  - 顶部大标题、类别徽章、年份、获奖信息、团队、指导教师、标签
 *  - 正文 .prose-glass
 *  - 侧栏：项目信息表（团队 / 成员 / 指导教师 / 年份 / 浏览量）+ 相关项目推荐
 * ========================================================================== */

const CAT_TONE: Record<string, 'primary' | 'accent' | 'success' | 'warning' | 'default'> = {
  excellent: 'warning',
  approved: 'primary',
  completed: 'success',
  ongoing: 'accent',
};

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const { data, meta, loading, error, reload } = useApi<any>(() => PublicApi.project(slug), [slug]);
  useTitle(data?.title ?? '项目详情');

  const project = data ?? null;
  const related: any[] = meta?.related ?? [];

  /* 详情数据到达后重新扫描滚动揭示元素 */
  useRevealScan(`project|${loading}|${related.length}`);

  /* ------------------------------- 状态页 ------------------------------- */
  if (loading && !project)
    return (
      <>
        <PageHero
          eyebrow="Project Detail"
          title="项目详情"
          breadcrumb={[{ label: '创新项目', to: '/projects' }, { label: '加载中…' }]}
        />
        <section className="shell pb-24">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-80" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </section>
      </>
    );

  if (error || !project)
    return (
      <>
        <PageHero
          eyebrow="Project Detail"
          title="项目不存在"
          breadcrumb={[{ label: '创新项目', to: '/projects' }, { label: '未找到' }]}
        />
        <section className="shell pb-24">
          <Glass tone="soft">
            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : (
              <EmptyState
                icon={<AlertTriangle className="h-6 w-6" />}
                title="项目不存在或已下架"
                description="该项目可能已被移除或尚未发布，请返回项目库浏览其他成果。"
                action={<LinkButton to="/projects">返回项目库</LinkButton>}
              />
            )}
          </Glass>
        </section>
      </>
    );

  const categoryLabel = PROJECT_CATEGORIES[project.category] ?? project.category;
  const members: string[] = Array.isArray(project.members) ? project.members : [];
  const tags: string[] = Array.isArray(project.tags) ? project.tags : [];

  return (
    <>
      <PageHero
        eyebrow="Project Detail"
        title={project.title}
        description={project.summary}
        breadcrumb={[{ label: '创新项目', to: '/projects' }, { label: project.title }]}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Chip tone={CAT_TONE[project.category] ?? 'primary'}>{categoryLabel}</Chip>
          <span className="mono flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {project.year} 年
          </span>
          <span className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {project.team || '未命名团队'}
            {members.length > 0 && <span className="mono">· {members.length + 1} 人</span>}
          </span>
          {project.advisor && (
            <span className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              指导教师 {project.advisor}
            </span>
          )}
        </div>

        {project.awards && (
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 px-4 py-2.5">
            <Trophy className="h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
            <span className="text-[12.5px] font-medium text-foreground/90">{project.awards}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
      </PageHero>

      <section className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ============================= 主列 ============================= */}
          <div className="flex min-w-0 flex-col gap-8">
            {/* 封面 */}
            <div className="relative overflow-hidden rounded-3xl border border-white/8" data-reveal="scale">
              {project.cover ? (
                <img src={project.cover} alt={project.title} loading="lazy" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent">
                  <GlowOrb className="-left-16 -top-20" size={360} color="rgba(186,230,253,.10)" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Trophy className="h-12 w-12 text-white/12" />
                    <span className="eyebrow">Innovation Showcase</span>
                    <span className="mono text-[11px] text-muted-foreground/70">{project.year} · {categoryLabel}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 获奖 / 关键信息 */}
            {project.awards && (
              <Glass tone="soft" className="flex items-start gap-4 p-6" data-reveal>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))]">
                  <Award className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold">获奖与荣誉</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">{project.awards}</p>
                </div>
              </Glass>
            )}

            {/* 正文 */}
            <Glass tone="soft" className="p-6 sm:p-8" data-reveal="blur">
              <h2 className="mb-6 flex items-center gap-2.5 text-[17px] font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                项目介绍
              </h2>
              <div
                className="prose-glass"
                dangerouslySetInnerHTML={{
                  __html:
                    project.content || '<p>该项目暂未补充详细介绍，如需了解更多可联系科技创新部获取项目材料。</p>',
                }}
              />
            </Glass>

            {/* 团队成员 */}
            <Glass tone="soft" className="p-6 sm:p-8" data-reveal>
              <h2 className="mb-5 flex items-center gap-2.5 text-[15px] font-semibold">
                <Users className="h-4 w-4 text-primary" />
                项目团队
              </h2>
              <div className="flex flex-wrap gap-3">
                {members.length ? (
                  members.map((m) => (
                    <div
                      key={m}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                    >
                      <Avatar name={m} size={30} />
                      <div>
                        <p className="text-[12.5px] font-medium">{m}</p>
                        <p className="text-[10.5px] text-muted-foreground">团队成员</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-muted-foreground">该项目未公开成员名单。</p>
                )}
              </div>
              <p className="mt-5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                指导教师：<span className="text-foreground/85">{project.advisor || '未填写'}</span>
              </p>
            </Glass>

          </div>

          {/* ============================= 侧栏 ============================= */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start" data-reveal="right">
            {/* 项目信息表 */}
            <Glass tone="soft" className="p-6">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <Layers className="h-4 w-4 text-primary" />
                项目信息
              </h3>
              <dl className="mt-5 flex flex-col divide-y divide-white/8">
                <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="团队名称">
                  {project.team || '—'}
                </InfoRow>
                <InfoRow icon={<UserRound className="h-3.5 w-3.5" />} label="团队成员">
                  {members.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {members.map((m) => (
                        <span key={m} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11.5px]">
                          {m}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '未公开'
                  )}
                </InfoRow>
                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="指导教师">
                  {project.advisor || '—'}
                </InfoRow>
                <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="立项年份">
                  <span className="mono">{project.year}</span> 年
                </InfoRow>
                <InfoRow icon={<Layers className="h-3.5 w-3.5" />} label="项目类别">
                  <Chip tone={CAT_TONE[project.category] ?? 'primary'} className="!px-2.5 !py-0.5">
                    {categoryLabel}
                  </Chip>
                </InfoRow>
                <InfoRow icon={<Eye className="h-3.5 w-3.5" />} label="浏览量">
                  <span className="mono">{fnum(project.views)}</span>
                </InfoRow>
                <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="收录时间">
                  <span className="mono">{fdate(project.createdAt)}</span>
                </InfoRow>
              </dl>

              {tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
                  {tags.map((t) => (
                    <Chip key={t} tone="accent">
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
            </Glass>

            {/* 相关项目 */}
            <Glass tone="soft" className="p-6">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <Sparkles className="h-4 w-4 text-accent" />
                相关项目推荐
              </h3>
              {related.length ? (
                <div className="mt-4 flex flex-col gap-3">
                  {related.map((r: any) => (
                    <ProjectCard key={r.id} project={r} size="sm" />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  暂无同类别的其他项目，可返回项目库浏览全部成果。
                </p>
              )}
              <LinkButton to="/projects" variant="glass" size="sm" className="mt-5 w-full">
                查看全部项目
              </LinkButton>
            </Glass>
          </aside>
        </div>
      </section>
    </>
  );
}

/* =============================================================================
 * 侧栏信息行
 * ========================================================================== */
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-[13px] leading-relaxed text-foreground/90">{children}</dd>
      </div>
    </div>
  );
}
