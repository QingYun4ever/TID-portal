import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Hash,
  Info,
  List,
  Paperclip,
  Pin,
  User,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useActiveSection, useApi, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, cn, fbytes, fdate, fdatetime, fnum, fromNow, plain } from '@/lib/utils';
import { ArticleCard } from '@/components/cards';
import { useRevealScope } from '@/components/RevealScope';
import { GlowOrb } from '@/components/LiquidBackdrop';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  PageHero,
  Skeleton,
} from '@/components/ui';

/* =============================================================================
 * 新闻详情 — /news/:slug
 * 正文富文本 + 附件下载 + 上下篇导航 + 相关阅读 + 桌面端 sticky 目录
 * ========================================================================== */

const CAT_TONE: Record<string, 'primary' | 'accent' | 'success' | 'warning'> = {
  notice: 'warning',
  dept: 'primary',
  competition: 'accent',
  policy: 'success',
};

const HEADING_RE = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;

/** 从正文 HTML 中提取目录，并为标题注入锚点（id + 滚动偏移） */
function buildToc(body: string) {
  const toc: { id: string; text: string; level: number }[] = [];
  if (!body) return { html: '', toc };
  let n = 0;
  const html = body.replace(HEADING_RE, (m, level: string, attrs: string, inner: string) => {
    const text = String(inner)
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return m;
    const id = `sec-${n++}`;
    toc.push({ id, text: text.length > 40 ? `${text.slice(0, 40)}…` : text, level: Number(level) });
    return `<h${level}${attrs}><span id="${id}" class="block scroll-mt-28">${inner}</span></h${level}>`;
  });
  return { html, toc };
}

export default function NewsDetail() {
  const { slug = '' } = useParams();
  const { data, meta, loading, error, reload } = useApi<any>(() => PublicApi.article(slug), [slug]);

  const article: any = data;
  useTitle(article?.title ? plain(article.title, 24) : '新闻详情');
  const revealRef = useRevealScope<HTMLDivElement>();

  const content: string = article?.content ?? '';
  const { html, toc } = useMemo(() => buildToc(content), [content]);
  const tocIds = useMemo(() => toc.map((t) => t.id), [toc]);
  const activeId = useActiveSection(tocIds);

  const attachments: any[] = meta.attachments ?? [];
  const related: any[] = meta.related ?? [];
  const prev: any = meta.prev ?? null;
  const next: any = meta.next ?? null;

  const jump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* ------------------------------ 加载 / 失败 ------------------------------ */
  if (error) {
    const missing = /不存在|404/.test(error);
    return (
      <div ref={revealRef}>
        <PageHero
          eyebrow="News Detail"
          title={missing ? '内容不存在' : '内容不可用'}
          breadcrumb={[{ label: '新闻与通知', to: '/news' }, { label: '详情' }]}
        />
        <div className="shell pb-24">
          <Glass tone="soft" className="p-4">
            {missing ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="这篇内容不存在或已下架"
                description="它可能已被撤回、修改了链接，或者从未发布。你可以返回列表查看最新发布的通知与新闻。"
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <LinkButton to="/news" variant="primary">
                      <ArrowLeft className="h-4 w-4" />
                      返回新闻列表
                    </LinkButton>
                    <Button onClick={reload}>重新加载</Button>
                  </div>
                }
              />
            ) : (
              <ErrorState message={error} onRetry={reload} />
            )}
          </Glass>
        </div>
      </div>
    );
  }

  if (loading && !article) {
    return (
      <div ref={revealRef}>
        <PageHero
          eyebrow="News Detail"
          title={<Skeleton className="h-12 w-3/4 max-w-2xl" />}
          breadcrumb={[{ label: '新闻与通知', to: '/news' }, { label: '加载中' }]}
        >
          <Skeleton className="h-5 w-64" />
        </PageHero>
        <div className="shell pb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Skeleton className="h-[520px]" />
            <div className="flex flex-col gap-5">
              <Skeleton className="h-52" />
              <Skeleton className="h-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const categoryLabel = NEWS_CATEGORIES[article.category] ?? article.category;
  const wordCount = plain(content, 200000).replace(/\s/g, '').length;

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow={categoryLabel}
        title={article.title}
        description={article.summary || undefined}
        breadcrumb={[{ label: '新闻与通知', to: '/news' }, { label: plain(article.title, 18) }]}
      >
        {/* 元信息 */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12.5px] text-muted-foreground">
          <Chip tone={CAT_TONE[article.category] ?? 'primary'}>{categoryLabel}</Chip>
          {article.pinned ? (
            <Chip tone="warning">
              <Pin className="h-3 w-3 -rotate-45" />
              置顶
            </Chip>
          ) : null}
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="mono">{fdate(article.publishedAt)}</span>
            <span className="text-muted-foreground/70">（{fromNow(article.publishedAt)}）</span>
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {article.authorName || '科技创新部'}
          </span>
          <span className="mono flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {fnum(article.views)} 次浏览
          </span>
        </div>

        {/* 标签 */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {article.tags.map((t: string) => (
              <Link key={t} to={`/news?tag=${encodeURIComponent(t)}`}>
                <Chip className="transition-all duration-300 hover:border-primary/40 hover:text-primary">{t}</Chip>
              </Link>
            ))}
          </div>
        )}
      </PageHero>

      <div className="shell pb-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ============================ 正文列 ============================ */}
          <div className="min-w-0">
            {article.cover && (
              <div className="mb-8 overflow-hidden rounded-3xl border border-white/10" data-reveal="scale">
                <img src={article.cover} alt={article.title} className="aspect-[16/9] w-full object-cover" />
              </div>
            )}

            <Glass tone="soft" className="p-4 sm:p-9" data-reveal>
              {html ? (
                <div className="prose-glass" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="text-[15px] text-muted-foreground">该内容暂无正文，详见下方附件。</p>
              )}
            </Glass>

            {/* 附件 */}
            {attachments.length > 0 && (
              <Glass tone="soft" className="mt-6 p-4 sm:p-6" data-reveal>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <h2 className="text-[15px] font-semibold">附件下载</h2>
                  <span className="mono ml-auto text-[11px] text-muted-foreground">{attachments.length} 个文件</span>
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {attachments.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 transition-all duration-300 hover:border-primary/35 hover:bg-primary/8 sm:gap-3.5 sm:px-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary sm:h-9 sm:w-9">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="clamp-1 block text-[13.5px] font-medium text-foreground/90">{f.name}</span>
                        <span className="mono mt-0.5 block text-[11px] text-muted-foreground">{fbytes(f.size)}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 group-hover:border-primary/40 group-hover:text-primary sm:px-3.5">
                        <Download className="h-3 w-3" />
                        下载
                      </span>
                    </a>
                  ))}
                </div>
              </Glass>
            )}

            {/* 上一篇 / 下一篇 */}
            {(prev || next) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2" data-reveal>
                {prev ? (
                  <Link to={`/news/${prev.slug}`} className="group block">
                    <Glass tone="soft" hover className="flex h-full flex-col gap-2 p-5">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ChevronLeft className="h-3.5 w-3.5" />
                        上一篇
                      </span>
                      <span className="clamp-2 text-[14px] font-medium transition-colors group-hover:text-primary">
                        {prev.title}
                      </span>
                    </Glass>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {next && (
                  <Link to={`/news/${next.slug}`} className="group block">
                    <Glass tone="soft" hover className="flex h-full flex-col items-end gap-2 p-5 text-right">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        下一篇
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                      <span className="clamp-2 text-[14px] font-medium transition-colors group-hover:text-primary">
                        {next.title}
                      </span>
                    </Glass>
                  </Link>
                )}
              </div>
            )}

            <div className="mt-8" data-reveal>
              <LinkButton to="/news" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                返回新闻列表
              </LinkButton>
            </div>
          </div>

          {/* ============================ 侧列（桌面 sticky） ============================ */}
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            {toc.length >= 2 && (
              <Glass tone="soft" className="relative overflow-hidden p-5" data-reveal="right">
                <GlowOrb className="-right-20 -top-20" size={240} color="rgba(186,230,253,.08)" />
                <div className="relative">
                  <div className="flex items-center gap-2.5">
                    <List className="h-4 w-4 text-primary" />
                    <h3 className="text-[14px] font-semibold">本文目录</h3>
                  </div>
                  <nav className="no-scrollbar mt-4 flex max-h-[46vh] flex-col gap-0.5 overflow-y-auto">
                    {toc.map((h) => {
                      const active = h.id === activeId;
                      return (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            jump(h.id);
                          }}
                          className={cn(
                            'relative rounded-xl py-2 pl-4 pr-2 text-[12.5px] leading-snug transition-all duration-300',
                            h.level === 3 && 'pl-8 text-[12px]',
                            active
                              ? 'bg-white/[0.06] text-foreground'
                              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground/85'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-300',
                              active ? 'bg-primary shadow-[0_0_10px_hsl(var(--primary)/.9)]' : 'bg-white/20'
                            )}
                          />
                          {h.text}
                        </a>
                      );
                    })}
                  </nav>
                </div>
              </Glass>
            )}

            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-[14px] font-semibold">内容信息</h3>
              </div>
              <dl className="mt-4 flex flex-col gap-3 text-[12.5px]">
                {[
                  { k: '所属分类', v: categoryLabel },
                  { k: '发布时间', v: fdatetime(article.publishedAt) },
                  { k: '发布作者', v: article.authorName || '科技创新部' },
                  { k: '浏览次数', v: `${fnum(article.views)} 次` },
                  { k: '正文体量', v: `${fnum(wordCount)} 字` },
                  { k: '附件数量', v: `${attachments.length} 个` },
                ].map((row) => (
                  <div key={row.k} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">{row.k}</dt>
                    <dd className="mono min-w-0 text-right text-foreground/85">{row.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="hairline my-4" />
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                如需转载或引用本内容，请注明来源「科技创新部」。
              </p>
            </Glass>
          </aside>
        </div>

        {/* ============================ 相关阅读 ============================ */}
        {related.length > 0 && (
          <section className="mt-20">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4" data-reveal>
              <div>
                <div className="eyebrow mb-3">Related</div>
                <h2 className="text-2xl font-semibold">相关阅读</h2>
              </div>
              <Link
                to={`/news?category=${encodeURIComponent(article.category)}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-primary transition hover:gap-2.5"
              >
                更多「{categoryLabel}」
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((a, i) => (
                <div key={a.id} data-reveal="scale" style={{ transitionDelay: `${i * 60}ms` }}>
                  <ArticleCard article={a} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
