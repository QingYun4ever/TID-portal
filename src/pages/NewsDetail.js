import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, FileText, Hash, Info, List, Paperclip, Pin, User, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useActiveSection, useApi, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, cn, fbytes, fdate, fdatetime, fnum, fromNow, plain } from '@/lib/utils';
import { ArticleCard } from '@/components/cards';
import { useRevealScope } from '@/components/RevealScope';
import { GlowOrb } from '@/components/LiquidBackdrop';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Skeleton, } from '@/components/ui';
/* =============================================================================
 * 新闻详情 — /news/:slug
 * 正文富文本 + 附件下载 + 上下篇导航 + 相关阅读 + 桌面端 sticky 目录
 * ========================================================================== */
const CAT_TONE = {
    notice: 'warning',
    dept: 'primary',
    competition: 'accent',
    policy: 'success',
};
const HEADING_RE = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;
/** 从正文 HTML 中提取目录，并为标题注入锚点（id + 滚动偏移） */
function buildToc(body) {
    const toc = [];
    if (!body)
        return { html: '', toc };
    let n = 0;
    const html = body.replace(HEADING_RE, (m, level, attrs, inner) => {
        const text = String(inner)
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text)
            return m;
        const id = `sec-${n++}`;
        toc.push({ id, text: text.length > 40 ? `${text.slice(0, 40)}…` : text, level: Number(level) });
        return `<h${level}${attrs}><span id="${id}" class="block scroll-mt-28">${inner}</span></h${level}>`;
    });
    return { html, toc };
}
export default function NewsDetail() {
    const { slug = '' } = useParams();
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.article(slug), [slug]);
    const article = data;
    useTitle(article?.title ? plain(article.title, 24) : '新闻详情');
    const revealRef = useRevealScope();
    const content = article?.content ?? '';
    const { html, toc } = useMemo(() => buildToc(content), [content]);
    const tocIds = useMemo(() => toc.map((t) => t.id), [toc]);
    const activeId = useActiveSection(tocIds);
    const attachments = meta.attachments ?? [];
    const related = meta.related ?? [];
    const prev = meta.prev ?? null;
    const next = meta.next ?? null;
    const jump = useCallback((id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);
    /* ------------------------------ 加载 / 失败 ------------------------------ */
    if (error) {
        const missing = /不存在|404/.test(error);
        return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "News Detail", title: missing ? '内容不存在' : '内容不可用', breadcrumb: [{ label: '新闻与通知', to: '/news' }, { label: '详情' }] }), _jsx("div", { className: "shell pb-24", children: _jsx(Glass, { tone: "soft", className: "p-4", children: missing ? (_jsx(EmptyState, { icon: _jsx(FileText, { className: "h-6 w-6" }), title: "\u8FD9\u7BC7\u5185\u5BB9\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6", description: "\u5B83\u53EF\u80FD\u5DF2\u88AB\u64A4\u56DE\u3001\u4FEE\u6539\u4E86\u94FE\u63A5\uFF0C\u6216\u8005\u4ECE\u672A\u53D1\u5E03\u3002\u4F60\u53EF\u4EE5\u8FD4\u56DE\u5217\u8868\u67E5\u770B\u6700\u65B0\u53D1\u5E03\u7684\u901A\u77E5\u4E0E\u65B0\u95FB\u3002", action: _jsxs("div", { className: "flex flex-wrap items-center justify-center gap-3", children: [_jsxs(LinkButton, { to: "/news", variant: "primary", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "\u8FD4\u56DE\u65B0\u95FB\u5217\u8868"] }), _jsx(Button, { onClick: reload, children: "\u91CD\u65B0\u52A0\u8F7D" })] }) })) : (_jsx(ErrorState, { message: error, onRetry: reload })) }) })] }));
    }
    if (loading && !article) {
        return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "News Detail", title: _jsx(Skeleton, { className: "h-12 w-3/4 max-w-2xl" }), breadcrumb: [{ label: '新闻与通知', to: '/news' }, { label: '加载中' }], children: _jsx(Skeleton, { className: "h-5 w-64" }) }), _jsx("div", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]", children: [_jsx(Skeleton, { className: "h-[520px]" }), _jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(Skeleton, { className: "h-52" }), _jsx(Skeleton, { className: "h-40" })] })] }) })] }));
    }
    if (!article)
        return null;
    const categoryLabel = NEWS_CATEGORIES[article.category] ?? article.category;
    const wordCount = plain(content, 200000).replace(/\s/g, '').length;
    return (_jsxs("div", { ref: revealRef, children: [_jsxs(PageHero, { eyebrow: categoryLabel, title: article.title, description: article.summary || undefined, breadcrumb: [{ label: '新闻与通知', to: '/news' }, { label: plain(article.title, 18) }], children: [_jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-3 text-[12.5px] text-muted-foreground", children: [_jsx(Chip, { tone: CAT_TONE[article.category] ?? 'primary', children: categoryLabel }), article.pinned ? (_jsxs(Chip, { tone: "warning", children: [_jsx(Pin, { className: "h-3 w-3 -rotate-45" }), "\u7F6E\u9876"] })) : null, _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "mono", children: fdate(article.publishedAt) }), _jsxs("span", { className: "text-muted-foreground/70", children: ["\uFF08", fromNow(article.publishedAt), "\uFF09"] })] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(User, { className: "h-3.5 w-3.5" }), article.authorName || '科技创新部'] }), _jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Eye, { className: "h-3.5 w-3.5" }), fnum(article.views), " \u6B21\u6D4F\u89C8"] })] }), Array.isArray(article.tags) && article.tags.length > 0 && (_jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", children: [_jsx(Hash, { className: "h-3.5 w-3.5 text-muted-foreground" }), article.tags.map((t) => (_jsx(Link, { to: `/news?tag=${encodeURIComponent(t)}`, children: _jsx(Chip, { className: "transition-all duration-300 hover:border-primary/40 hover:text-primary", children: t }) }, t)))] }))] }), _jsxs("div", { className: "shell pb-24", children: [_jsxs("div", { className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]", children: [_jsxs("div", { className: "min-w-0", children: [article.cover && (_jsx("div", { className: "mb-8 overflow-hidden rounded-3xl border border-white/10", "data-reveal": "scale", children: _jsx("img", { src: article.cover, alt: article.title, className: "aspect-[16/9] w-full object-cover" }) })), _jsx(Glass, { tone: "soft", className: "p-6 sm:p-9", "data-reveal": true, children: html ? (_jsx("div", { className: "prose-glass", dangerouslySetInnerHTML: { __html: html } })) : (_jsx("p", { className: "text-[15px] text-muted-foreground", children: "\u8BE5\u5185\u5BB9\u6682\u65E0\u6B63\u6587\uFF0C\u8BE6\u89C1\u4E0B\u65B9\u9644\u4EF6\u3002" })) }), attachments.length > 0 && (_jsxs(Glass, { tone: "soft", className: "mt-6 p-6", "data-reveal": true, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Paperclip, { className: "h-4 w-4 text-primary" }), _jsx("h2", { className: "text-[15px] font-semibold", children: "\u9644\u4EF6\u4E0B\u8F7D" }), _jsxs("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: [attachments.length, " \u4E2A\u6587\u4EF6"] })] }), _jsx("div", { className: "mt-4 flex flex-col gap-2.5", children: attachments.map((f) => (_jsxs("a", { href: f.url, target: "_blank", rel: "noreferrer noopener", className: "group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 transition-all duration-300 hover:border-primary/35 hover:bg-primary/8", children: [_jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary", children: _jsx(FileText, { className: "h-4 w-4" }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "clamp-1 block text-[13.5px] font-medium text-foreground/90", children: f.name }), _jsx("span", { className: "mono mt-0.5 block text-[11px] text-muted-foreground", children: fbytes(f.size) })] }), _jsxs("span", { className: "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 group-hover:border-primary/40 group-hover:text-primary", children: [_jsx(Download, { className: "h-3 w-3" }), "\u4E0B\u8F7D"] })] }, f.id))) })] })), (prev || next) && (_jsxs("div", { className: "mt-8 grid gap-4 sm:grid-cols-2", "data-reveal": true, children: [prev ? (_jsx(Link, { to: `/news/${prev.slug}`, className: "group block", children: _jsxs(Glass, { tone: "soft", hover: true, className: "flex h-full flex-col gap-2 p-5", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-[11px] text-muted-foreground", children: [_jsx(ChevronLeft, { className: "h-3.5 w-3.5" }), "\u4E0A\u4E00\u7BC7"] }), _jsx("span", { className: "clamp-2 text-[14px] font-medium transition-colors group-hover:text-primary", children: prev.title })] }) })) : (_jsx("div", { className: "hidden sm:block" })), next && (_jsx(Link, { to: `/news/${next.slug}`, className: "group block", children: _jsxs(Glass, { tone: "soft", hover: true, className: "flex h-full flex-col items-end gap-2 p-5 text-right", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-[11px] text-muted-foreground", children: ["\u4E0B\u4E00\u7BC7", _jsx(ChevronRight, { className: "h-3.5 w-3.5" })] }), _jsx("span", { className: "clamp-2 text-[14px] font-medium transition-colors group-hover:text-primary", children: next.title })] }) }))] })), _jsx("div", { className: "mt-8", "data-reveal": true, children: _jsxs(LinkButton, { to: "/news", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "\u8FD4\u56DE\u65B0\u95FB\u5217\u8868"] }) })] }), _jsxs("aside", { className: "flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start", children: [toc.length >= 2 && (_jsxs(Glass, { tone: "soft", className: "relative overflow-hidden p-5", "data-reveal": "right", children: [_jsx(GlowOrb, { className: "-right-20 -top-20", size: 240, color: "rgba(186,230,253,.08)" }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(List, { className: "h-4 w-4 text-primary" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u672C\u6587\u76EE\u5F55" })] }), _jsx("nav", { className: "no-scrollbar mt-4 flex max-h-[46vh] flex-col gap-0.5 overflow-y-auto", children: toc.map((h) => {
                                                            const active = h.id === activeId;
                                                            return (_jsxs("a", { href: `#${h.id}`, onClick: (e) => {
                                                                    e.preventDefault();
                                                                    jump(h.id);
                                                                }, className: cn('relative rounded-xl py-2 pl-4 pr-2 text-[12.5px] leading-snug transition-all duration-300', h.level === 3 && 'pl-8 text-[12px]', active
                                                                    ? 'bg-white/[0.06] text-foreground'
                                                                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground/85'), children: [_jsx("span", { className: cn('absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-300', active ? 'bg-primary shadow-[0_0_10px_hsl(var(--primary)/.9)]' : 'bg-white/20') }), h.text] }, h.id));
                                                        }) })] })] })), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Info, { className: "h-4 w-4 text-primary" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u5185\u5BB9\u4FE1\u606F" })] }), _jsx("dl", { className: "mt-4 flex flex-col gap-3 text-[12.5px]", children: [
                                                    { k: '所属分类', v: categoryLabel },
                                                    { k: '发布时间', v: fdatetime(article.publishedAt) },
                                                    { k: '发布作者', v: article.authorName || '科技创新部' },
                                                    { k: '浏览次数', v: `${fnum(article.views)} 次` },
                                                    { k: '正文体量', v: `${fnum(wordCount)} 字` },
                                                    { k: '附件数量', v: `${attachments.length} 个` },
                                                ].map((row) => (_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsx("dt", { className: "shrink-0 text-muted-foreground", children: row.k }), _jsx("dd", { className: "mono min-w-0 text-right text-foreground/85", children: row.v })] }, row.k))) }), _jsx("div", { className: "hairline my-4" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: "\u5982\u9700\u8F6C\u8F7D\u6216\u5F15\u7528\u672C\u5185\u5BB9\uFF0C\u8BF7\u6CE8\u660E\u6765\u6E90\u300C\u79D1\u6280\u521B\u65B0\u90E8\u300D\u3002" })] })] })] }), related.length > 0 && (_jsxs("section", { className: "mt-20", children: [_jsxs("div", { className: "mb-6 flex items-end justify-between gap-4", "data-reveal": true, children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow mb-3", children: "Related" }), _jsx("h2", { className: "text-2xl font-semibold", children: "\u76F8\u5173\u9605\u8BFB" })] }), _jsxs(Link, { to: `/news?category=${encodeURIComponent(article.category)}`, className: "inline-flex items-center gap-1.5 text-[13px] text-primary transition hover:gap-2.5", children: ["\u66F4\u591A\u300C", categoryLabel, "\u300D", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: related.slice(0, 4).map((a, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${i * 60}ms` }, children: _jsx(ArticleCard, { article: a }) }, a.id))) })] }))] })] }));
}
