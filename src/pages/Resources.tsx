import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Download,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Layers,
} from 'lucide-react';

import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { RESOURCE_CATEGORIES, fnum } from '@/lib/utils';
import { ResourceCard } from '@/components/cards';
import {
  Accordion,
  Button,
  EmptyState,
  ErrorState,
  Glass,
  Link,
  PageHero,
  SearchInput,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 资源中心 /resources
 *  - 类别筛选（带数量）+ 搜索 + 资源卡片网格
 *  - 底部：常见问题 FAQ（取 category = faq 的资源）
 *  - 侧栏：其他资源站外链
 * ========================================================================== */

const CAT_ORDER = ['template', 'policy', 'guide', 'training', 'faq'];

const EXTERNAL_SITES = [
  { name: '大学生创新创业训练计划平台', desc: '国创计划项目申报与结题', url: 'https://cxcy.upln.cn/' },
  { name: '全国大学生创业服务网', desc: '中国国际大学生创新大赛', url: 'https://cy.ncss.cn/' },
  { name: '「挑战杯」竞赛官网', desc: '课外学术科技作品竞赛', url: 'https://www.tiaozhanbei.net/' },
  { name: '教育部官网', desc: '政策文件与通知公告', url: 'http://www.moe.gov.cn/' },
];

export default function Resources() {
  useTitle('资源中心');
  const toast = useToast();

  const [category, setCategory] = useState('all');
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput, 320);

  const { data, meta, loading, error, reload } = useApi<any[]>(
    () => PublicApi.resources({ category, q }),
    [category, q]
  );

  /* FAQ 单独取一次，保证切换分类时底部 FAQ 仍然可用 */
  const faqState = useApi<any[]>(() => PublicApi.resources({ category: 'faq' }), []);

  const items = data ?? [];
  const counts: Record<string, number> = (meta?.counts as Record<string, number>) ?? {};
  const totalAll = useMemo(() => CAT_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0), [counts]);

  useRevealScan(`resources-${category}-${q}-${items.length}`);

  const faqItems = useMemo(
    () =>
      (faqState.data ?? []).map((r: any) => ({
        q: r.title as string,
        a: (
          <div className="space-y-2.5">
            <p>{r.description}</p>
            {r.url && r.url !== '#' ? (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-primary"
              >
                查看相关文件 <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-[12px] text-muted-foreground/70">
                更多说明可通过「在线咨询」提交，部门会在 3 个工作日内答复。
              </p>
            )}
          </div>
        ),
      })),
    [faqState.data]
  );

  const tabs = [
    { value: 'all', label: '全部资源', count: totalAll || undefined },
    ...CAT_ORDER.map((k) => ({ value: k, label: RESOURCE_CATEGORIES[k] ?? k, count: counts[k] ?? 0 })),
  ];

  const currentLabel = category === 'all' ? '全部资源' : RESOURCE_CATEGORIES[category] ?? category;

  const handleDownload = async (r: any) => {
    try {
      const out = await SubmitApi.downloadResource(r.id);
      if (r.external && r.url && r.url !== '#') window.open(r.url, '_blank');
      toast.success('开始下载', `${r.title}（累计 ${fnum(out.downloads)} 次下载）`);
      if (!r.external) {
        if (r.url && r.url !== '#') window.open(r.url, '_blank');
        else toast.info('演示数据', '该资源为演示条目，未绑定真实文件。可在后台「资源中心」上传实际文件。');
      }
      reload();
    } catch (e: any) {
      toast.error('下载失败', e?.message || '请稍后重试');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Resource Center"
        title="资源中心"
        description="申报书模板、商业计划书、政策文件、竞赛指南与培训资料，一站式查阅与下载。全部文件由科技创新部整理发布。"
        breadcrumb={[{ label: '资源中心' }]}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[12px] text-muted-foreground">
          <span className="mono flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            共收录 <span className="text-foreground">{fnum(totalAll)}</span> 份资料
          </span>
          <span className="text-white/15">|</span>
          <span>{CAT_ORDER.length} 个类别 · 支持关键词检索</span>
        </div>
      </PageHero>

      <div className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_308px] lg:gap-10">
          {/* ---------------- 主区 ---------------- */}
          <div className="min-w-0">
            {/* 筛选栏 */}
            <div className="mb-8 flex flex-col gap-4" data-reveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Tabs items={tabs} value={category} onChange={setCategory} />
                <SearchInput
                  value={qInput}
                  onChange={setQInput}
                  placeholder="搜索资源标题或说明…"
                  className="w-full sm:w-72"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                <p>
                  当前分类：<span className="text-foreground/90">{currentLabel}</span>
                  {q ? <> · 搜索「{q}」</> : null} · 共 <span className="mono text-foreground">{items.length}</span> 条
                </p>
                {(q || category !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQInput('');
                      setCategory('all');
                    }}
                  >
                    清除筛选
                  </Button>
                )}
              </div>
            </div>

            {/* 列表 */}
            {error ? (
              <Glass tone="soft" className="p-4">
                <ErrorState message={error} onRetry={reload} />
              </Glass>
            ) : loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[212px]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Glass tone="soft">
                <EmptyState
                  icon={<FolderOpen className="h-5 w-5" />}
                  title="没有找到相关资源"
                  description={q ? '换个关键词试试，或切换到其他分类浏览。' : '该分类下暂时还没有上传资料。'}
                  action={
                    <Button
                      onClick={() => {
                        setQInput('');
                        setCategory('all');
                      }}
                    >
                      查看全部资源
                    </Button>
                  }
                />
              </Glass>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((r, i) => (
                  <div key={r.id} data-reveal="scale" style={{ transitionDelay: `${(i % 6) * 55}ms` }}>
                    <ResourceCard resource={r} onDownload={handleDownload} />
                  </div>
                ))}
              </div>
            )}

            {/* 常见问题 */}
            <section className="mt-16 scroll-mt-28" id="faq">
              <div className="mb-6" data-reveal>
                <div className="eyebrow mb-3">Frequently Asked Questions</div>
                <h2 className="flex items-center gap-2.5 text-xl font-semibold">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  常见问题
                </h2>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                  关于申报、下载与材料提交的高频疑问，来自资源中心「常见问题」分类。
                </p>
              </div>

              {faqState.loading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : faqItems.length ? (
                <div data-reveal="blur">
                  <Accordion items={faqItems} />
                </div>
              ) : (
                <Glass tone="soft" className="px-6 py-8 text-center text-[12.5px] text-muted-foreground">
                  暂无常见问题条目
                </Glass>
              )}
            </section>
          </div>

          {/* ---------------- 侧栏 ---------------- */}
          <aside className="flex flex-col gap-5">
            <Glass tone="soft" className="p-5" data-reveal="right">
              <h2 className="flex items-center gap-2.5 text-[14px] font-semibold">
                <Info className="h-4 w-4 text-primary" />
                下载与使用提示
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {[
                  '标有「前往」的资源为外部链接，将跳转至赛事或政策官网。',
                  '标有「下载」的资源由部门统一维护，下载次数实时统计。',
                  '演示条目未绑定真实文件，上传后即可正常下载。',
                  '若发现文件失效或内容过期，请通过「在线咨询」反馈。',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-foreground/80">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </Glass>

            <Glass tone="soft" className="p-5" data-reveal="right">
              <h2 className="flex items-center gap-2.5 text-[14px] font-semibold">
                <BookOpen className="h-4 w-4 text-accent" />
                其他资源站
              </h2>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                以下为官方赛事与政策平台的快捷入口，均在新窗口打开。
              </p>
              <div className="mt-4 flex flex-col gap-2.5">
                {EXTERNAL_SITES.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-primary/30 hover:bg-primary/8"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/90">
                        <span className="clamp-1">{s.name}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" />
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{s.desc}</span>
                    </span>
                  </a>
                ))}
              </div>
            </Glass>

            <Glass tone="thin" className="p-5" data-reveal="right">
              <h2 className="flex items-center gap-2.5 text-[14px] font-semibold">
                <Download className="h-4 w-4 text-[hsl(var(--success))]" />
                找不到需要的材料？
              </h2>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                资源卡片右侧数字为累计下载次数。若需要部门代为整理某类材料，可通过
                <Link to="/feedback" className="mx-1 text-primary transition hover:underline">
                  在线咨询
                </Link>
                提交需求。
              </p>
            </Glass>
          </aside>
        </div>
      </div>
    </>
  );
}
