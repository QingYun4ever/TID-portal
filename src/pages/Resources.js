import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Download, FileText, FolderOpen, HelpCircle, Info, Layers, } from 'lucide-react';
import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { RESOURCE_CATEGORIES, fnum } from '@/lib/utils';
import { ResourceCard } from '@/components/cards';
import { Accordion, Button, EmptyState, ErrorState, Glass, Link, PageHero, SearchInput, Skeleton, Tabs, } from '@/components/ui';
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
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.resources({ category, q }), [category, q]);
    /* FAQ 单独取一次，保证切换分类时底部 FAQ 仍然可用 */
    const faqState = useApi(() => PublicApi.resources({ category: 'faq' }), []);
    const items = data ?? [];
    const counts = meta?.counts ?? {};
    const totalAll = useMemo(() => CAT_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0), [counts]);
    useRevealScan(`resources-${category}-${q}-${items.length}`);
    const faqItems = useMemo(() => (faqState.data ?? []).map((r) => ({
        q: r.title,
        a: (_jsxs("div", { className: "space-y-2.5", children: [_jsx("p", { children: r.description }), r.url && r.url !== '#' ? (_jsxs("a", { href: r.url, target: "_blank", rel: "noreferrer noopener", className: "inline-flex items-center gap-1.5 text-primary", children: ["\u67E5\u770B\u76F8\u5173\u6587\u4EF6 ", _jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })] })) : (_jsx("p", { className: "text-[12px] text-muted-foreground/70", children: "\u66F4\u591A\u8BF4\u660E\u53EF\u901A\u8FC7\u300C\u5728\u7EBF\u54A8\u8BE2\u300D\u63D0\u4EA4\uFF0C\u90E8\u95E8\u4F1A\u5728 3 \u4E2A\u5DE5\u4F5C\u65E5\u5185\u7B54\u590D\u3002" }))] })),
    })), [faqState.data]);
    const tabs = [
        { value: 'all', label: '全部资源', count: totalAll || undefined },
        ...CAT_ORDER.map((k) => ({ value: k, label: RESOURCE_CATEGORIES[k] ?? k, count: counts[k] ?? 0 })),
    ];
    const currentLabel = category === 'all' ? '全部资源' : RESOURCE_CATEGORIES[category] ?? category;
    const handleDownload = async (r) => {
        try {
            const out = await SubmitApi.downloadResource(r.id);
            if (r.external && r.url && r.url !== '#')
                window.open(r.url, '_blank');
            toast.success('开始下载', `${r.title}（累计 ${fnum(out.downloads)} 次下载）`);
            if (!r.external) {
                if (r.url && r.url !== '#')
                    window.open(r.url, '_blank');
                else
                    toast.info('演示数据', '该资源为演示条目，未绑定真实文件。可在后台「资源中心」上传实际文件。');
            }
            reload();
        }
        catch (e) {
            toast.error('下载失败', e?.message || '请稍后重试');
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Resource Center", title: "\u8D44\u6E90\u4E2D\u5FC3", description: "\u7533\u62A5\u4E66\u6A21\u677F\u3001\u5546\u4E1A\u8BA1\u5212\u4E66\u3001\u653F\u7B56\u6587\u4EF6\u3001\u7ADE\u8D5B\u6307\u5357\u4E0E\u57F9\u8BAD\u8D44\u6599\uFF0C\u4E00\u7AD9\u5F0F\u67E5\u9605\u4E0E\u4E0B\u8F7D\u3002\u5168\u90E8\u6587\u4EF6\u7531\u79D1\u6280\u521B\u65B0\u90E8\u6574\u7406\u53D1\u5E03\u3002", breadcrumb: [{ label: '资源中心' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Layers, { className: "h-3.5 w-3.5 text-primary" }), "\u5171\u6536\u5F55 ", _jsx("span", { className: "text-foreground", children: fnum(totalAll) }), " \u4EFD\u8D44\u6599"] }), _jsx("span", { className: "text-white/15", children: "|" }), _jsxs("span", { children: [CAT_ORDER.length, " \u4E2A\u7C7B\u522B \u00B7 \u652F\u6301\u5173\u952E\u8BCD\u68C0\u7D22"] })] }) }), _jsx("div", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_308px] lg:gap-10", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "mb-8 flex flex-col gap-4", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsx(Tabs, { items: tabs, value: category, onChange: setCategory }), _jsx(SearchInput, { value: qInput, onChange: setQInput, placeholder: "\u641C\u7D22\u8D44\u6E90\u6807\u9898\u6216\u8BF4\u660E\u2026", className: "w-full sm:w-72" })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground", children: [_jsxs("p", { children: ["\u5F53\u524D\u5206\u7C7B\uFF1A", _jsx("span", { className: "text-foreground/90", children: currentLabel }), q ? _jsxs(_Fragment, { children: [" \u00B7 \u641C\u7D22\u300C", q, "\u300D"] }) : null, " \u00B7 \u5171 ", _jsx("span", { className: "mono text-foreground", children: items.length }), " \u6761"] }), (q || category !== 'all') && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                                        setQInput('');
                                                        setCategory('all');
                                                    }, children: "\u6E05\u9664\u7B5B\u9009" }))] })] }), error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-[212px]" }, i))) })) : items.length === 0 ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(FolderOpen, { className: "h-5 w-5" }), title: "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u8D44\u6E90", description: q ? '换个关键词试试，或切换到其他分类浏览。' : '该分类下暂时还没有上传资料。', action: _jsx(Button, { onClick: () => {
                                                setQInput('');
                                                setCategory('all');
                                            }, children: "\u67E5\u770B\u5168\u90E8\u8D44\u6E90" }) }) })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: items.map((r, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 6) * 55}ms` }, children: _jsx(ResourceCard, { resource: r, onDownload: handleDownload }) }, r.id))) })), _jsxs("section", { className: "mt-16 scroll-mt-28", id: "faq", children: [_jsxs("div", { className: "mb-6", "data-reveal": true, children: [_jsx("div", { className: "eyebrow mb-3", children: "Frequently Asked Questions" }), _jsxs("h2", { className: "flex items-center gap-2.5 text-xl font-semibold", children: [_jsx(HelpCircle, { className: "h-4 w-4 text-primary" }), "\u5E38\u89C1\u95EE\u9898"] }), _jsx("p", { className: "mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground", children: "\u5173\u4E8E\u7533\u62A5\u3001\u4E0B\u8F7D\u4E0E\u6750\u6599\u63D0\u4EA4\u7684\u9AD8\u9891\u7591\u95EE\uFF0C\u6765\u81EA\u8D44\u6E90\u4E2D\u5FC3\u300C\u5E38\u89C1\u95EE\u9898\u300D\u5206\u7C7B\u3002" })] }), faqState.loading ? (_jsx("div", { className: "flex flex-col gap-2.5", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-14" }, i))) })) : faqItems.length ? (_jsx("div", { "data-reveal": "blur", children: _jsx(Accordion, { items: faqItems }) })) : (_jsx(Glass, { tone: "soft", className: "px-6 py-8 text-center text-[12.5px] text-muted-foreground", children: "\u6682\u65E0\u5E38\u89C1\u95EE\u9898\u6761\u76EE" }))] })] }), _jsxs("aside", { className: "flex flex-col gap-5", children: [_jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-[14px] font-semibold", children: [_jsx(Info, { className: "h-4 w-4 text-primary" }), "\u4E0B\u8F7D\u4E0E\u4F7F\u7528\u63D0\u793A"] }), _jsx("ul", { className: "mt-4 flex flex-col gap-3", children: [
                                                '标有「前往」的资源为外部链接，将跳转至赛事或政策官网。',
                                                '标有「下载」的资源由部门统一维护，下载次数实时统计。',
                                                '演示条目未绑定真实文件，上传后即可正常下载。',
                                                '若发现文件失效或内容过期，请通过「在线咨询」反馈。',
                                            ].map((t) => (_jsxs("li", { className: "flex items-start gap-2.5 text-[12.5px] leading-relaxed text-foreground/80", children: [_jsx("span", { className: "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }), t] }, t))) })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-[14px] font-semibold", children: [_jsx(BookOpen, { className: "h-4 w-4 text-accent" }), "\u5176\u4ED6\u8D44\u6E90\u7AD9"] }), _jsx("p", { className: "mt-2.5 text-[12px] leading-relaxed text-muted-foreground", children: "\u4EE5\u4E0B\u4E3A\u5B98\u65B9\u8D5B\u4E8B\u4E0E\u653F\u7B56\u5E73\u53F0\u7684\u5FEB\u6377\u5165\u53E3\uFF0C\u5747\u5728\u65B0\u7A97\u53E3\u6253\u5F00\u3002" }), _jsx("div", { className: "mt-4 flex flex-col gap-2.5", children: EXTERNAL_SITES.map((s) => (_jsxs("a", { href: s.url, target: "_blank", rel: "noreferrer noopener", className: "group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-primary/30 hover:bg-primary/8", children: [_jsx("span", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary", children: _jsx(FileText, { className: "h-3.5 w-3.5" }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/90", children: [_jsx("span", { className: "clamp-1", children: s.name }), _jsx(ArrowUpRight, { className: "h-3 w-3 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" })] }), _jsx("span", { className: "mt-1 block text-[11px] text-muted-foreground", children: s.desc })] })] }, s.url))) })] }), _jsxs(Glass, { tone: "thin", className: "p-5", "data-reveal": "right", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-[14px] font-semibold", children: [_jsx(Download, { className: "h-4 w-4 text-[hsl(var(--success))]" }), "\u627E\u4E0D\u5230\u9700\u8981\u7684\u6750\u6599\uFF1F"] }), _jsxs("p", { className: "mt-2.5 text-[12px] leading-relaxed text-muted-foreground", children: ["\u8D44\u6E90\u5361\u7247\u53F3\u4FA7\u6570\u5B57\u4E3A\u7D2F\u8BA1\u4E0B\u8F7D\u6B21\u6570\u3002\u82E5\u9700\u8981\u90E8\u95E8\u4EE3\u4E3A\u6574\u7406\u67D0\u7C7B\u6750\u6599\uFF0C\u53EF\u901A\u8FC7", _jsx(Link, { to: "/feedback", className: "mx-1 text-primary transition hover:underline", children: "\u5728\u7EBF\u54A8\u8BE2" }), "\u63D0\u4EA4\u9700\u6C42\u3002"] })] })] })] }) })] }));
}
