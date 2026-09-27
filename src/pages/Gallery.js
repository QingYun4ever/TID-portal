import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, FolderTree, Image as ImageIcon, Images, Minus, Plus, RotateCcw, X, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useBodyLock, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { cn, fnum, seedRand } from '@/lib/utils';
import { Button, Drawer, EmptyState, ErrorState, Glass, PageHero, Pagination, SearchInput, Skeleton, } from '@/components/ui';
/* =============================================================================
 * 活动画廊 /gallery
 *  - 左侧递归分类树（含子区域图片数）
 *  - 右侧图片瀑布流（CSS columns）+ 分页
 *  - 全屏灯箱：键盘 / 半区点击 / 缩放 / 拖拽平移
 * ========================================================================== */
const PAGE_SIZE = 12;
/* ---------------------------- 分类树工具函数 ----------------------------- */
function findPath(nodes, id, trail = []) {
    for (const n of nodes) {
        const next = [...trail, n];
        if (n.id === id)
            return next;
        const deeper = findPath(n.children ?? [], id, next);
        if (deeper.length)
            return deeper;
    }
    return [];
}
/** 图片容器比例：优先真实尺寸，缺失时按 id 生成稳定比例，避免布局抖动 */
function ratioOf(img) {
    const w = Number(img.width) || 0;
    const h = Number(img.height) || 0;
    if (w > 0 && h > 0)
        return Math.min(1.6, Math.max(0.62, w / h));
    return 100 / seedRand(String(img.id), 72, 128);
}
/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Gallery() {
    useTitle('活动画廊');
    const [areaId, setAreaId] = useState(null);
    const [qInput, setQInput] = useState('');
    const q = useDebounced(qInput, 320);
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState([]);
    const [treeOpen, setTreeOpen] = useState(false);
    const [boxIndex, setBoxIndex] = useState(null);
    const areasState = useApi(() => PublicApi.galleryAreas(), []);
    const tree = useMemo(() => areasState.data ?? [], [areasState.data]);
    const imagesState = useApi(() => PublicApi.galleryImages({ page, pageSize: PAGE_SIZE, areaId: areaId ?? 'all', q }), [page, areaId, q]);
    const items = imagesState.data?.items ?? [];
    const total = imagesState.data?.total ?? 0;
    useEffect(() => {
        setPage(1);
    }, [areaId, q]);
    /* 初始展开有子区域的根节点 */
    useEffect(() => {
        const list = areasState.data;
        if (!list)
            return;
        setExpanded(list.filter((a) => (a.children ?? []).length > 0).map((a) => a.id));
    }, [areasState.data]);
    const path = useMemo(() => (areaId === null ? [] : findPath(tree, areaId)), [tree, areaId]);
    const pathKey = path.map((p) => p.id).join(',');
    const current = path.length ? path[path.length - 1] : null;
    const parent = path.length > 1 ? path[path.length - 2] : null;
    /* 选中深层区域时自动展开祖先 */
    useEffect(() => {
        if (!path.length)
            return;
        setExpanded((prev) => Array.from(new Set([...prev, ...path.slice(0, -1).map((n) => n.id)])));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathKey]);
    /* 数据到位后重新扫描滚动揭示元素 */
    useRevealScan(`gallery-${page}-${areaId}-${q}-${items.length}-${pathKey}`);
    const toggleExpand = useCallback((id) => {
        setExpanded((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
    }, []);
    const select = useCallback((id) => {
        setAreaId(id);
        setTreeOpen(false);
    }, []);
    const openAt = useCallback((index) => setBoxIndex(index), []);
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Gallery", title: "\u6D3B\u52A8\u753B\u5ECA", description: "\u79D1\u6280\u6587\u5316\u8282\u3001\u7ADE\u8D5B\u73B0\u573A\u3001\u521B\u65B0\u5DE5\u574A\u4E0E\u8BB2\u5EA7\u6C99\u9F99\u7684\u5F71\u50CF\u8BB0\u5F55\u3002\u6309\u5206\u7C7B\u6D4F\u89C8\uFF0C\u70B9\u51FB\u4EFB\u610F\u56FE\u7247\u8FDB\u5165\u5168\u5C4F\u67E5\u770B\u3002", breadcrumb: [{ label: '活动画廊' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Images, { className: "h-3.5 w-3.5 text-primary" }), "\u5168\u7AD9\u6536\u5F55", _jsx("span", { className: "mono text-foreground", children: fnum(tree.reduce((s, a) => s + a.imageCount, 0)) }), "\u5F20\u5F71\u50CF"] }), _jsx("span", { className: "text-white/15", children: "|" }), _jsxs("span", { className: "mono", children: ["\u5171 ", tree.length, " \u4E2A\u4E00\u7EA7\u5206\u7C7B"] })] }) }), _jsx("div", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10", children: [_jsx("aside", { className: "hidden lg:block", children: _jsx("div", { className: "sticky top-24", children: _jsxs(Glass, { tone: "soft", className: "p-4", "data-reveal": "left", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2 px-1", children: [_jsx(FolderTree, { className: "h-3.5 w-3.5 text-primary" }), _jsx("h2", { className: "text-[13px] font-semibold", children: "\u56FE\u7247\u5206\u7C7B" })] }), areasState.loading ? (_jsx("div", { className: "flex flex-col gap-2", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-9" }, i))) })) : areasState.error ? (_jsx(ErrorState, { message: areasState.error, onRetry: areasState.reload })) : (_jsx(AreaTree, { nodes: tree, selectedId: areaId, expanded: expanded, onToggle: toggleExpand, onSelect: select, totalCount: tree.reduce((s, a) => s + a.imageCount, 0) }))] }) }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "mb-5 lg:hidden", children: _jsxs("div", { className: "no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-1", children: [_jsx("button", { onClick: () => select(null), className: cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-300', areaId === null
                                                    ? 'border-primary/40 bg-primary/14 text-primary'
                                                    : 'border-white/10 bg-white/[0.045] text-muted-foreground'), children: "\u5168\u90E8\u56FE\u7247" }), tree.map((a) => (_jsxs("button", { onClick: () => select(a.id), className: cn('shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-300', areaId === a.id
                                                    ? 'border-primary/40 bg-primary/14 text-primary'
                                                    : 'border-white/10 bg-white/[0.045] text-muted-foreground'), children: [a.name, _jsx("span", { className: "mono ml-1.5 text-[10px] opacity-70", children: a.imageCount })] }, a.id))), _jsxs("button", { onClick: () => setTreeOpen(true), className: "chip shrink-0 !px-3.5 !py-1.5 !text-[12px] !text-foreground/85", children: [_jsx(FolderTree, { className: "h-3 w-3" }), "\u5168\u90E8\u5206\u7C7B"] })] }) }), _jsxs("div", { className: "mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", "data-reveal": true, children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("nav", { className: "flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground", children: [_jsx("button", { onClick: () => select(null), className: "transition hover:text-foreground", children: "\u5168\u90E8\u5206\u7C7B" }), path.map((p) => (_jsxs(React.Fragment, { children: [_jsx("span", { className: "text-white/20", children: "/" }), _jsx("button", { onClick: () => select(p.id), className: cn('transition hover:text-foreground', p.id === areaId && 'text-foreground/90'), children: p.name })] }, p.id)))] }), _jsx("h2", { className: "mt-1.5 text-xl font-semibold tracking-tight", children: current?.name ?? '全部图片' }), _jsxs("p", { className: "mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground", children: ["\u5171 ", _jsx("span", { className: "mono text-foreground", children: fnum(total) }), " \u5F20", q ? _jsxs(_Fragment, { children: [" \u00B7 \u641C\u7D22\u300C", q, "\u300D"] }) : null, current?.description ? _jsxs(_Fragment, { children: [" \u00B7 ", current.description] }) : null] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [parent && (_jsxs(Button, { variant: "glass", size: "sm", onClick: () => select(parent.id), children: [_jsx(ArrowLeft, { className: "h-3.5 w-3.5" }), "\u8FD4\u56DE\u4E0A\u7EA7\uFF1A", parent.name] })), areaId !== null && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => select(null), children: "\u8FD4\u56DE\u5168\u90E8" })), _jsx(SearchInput, { value: qInput, onChange: setQInput, placeholder: "\u641C\u7D22\u56FE\u7247\u6807\u9898\u6216\u63CF\u8FF0\u2026", className: "w-full sm:w-64" })] })] }), imagesState.error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: imagesState.error, onRetry: imagesState.reload }) })) : imagesState.loading ? (_jsx(MasonrySkeleton, {})) : items.length === 0 ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(ImageIcon, { className: "h-5 w-5" }), title: "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u56FE\u7247", description: q ? '换个关键词，或切换其他分类看看。' : '该分类下暂时还没有影像记录。', action: _jsx(Button, { onClick: () => {
                                                setQInput('');
                                                select(null);
                                            }, children: "\u67E5\u770B\u5168\u90E8\u56FE\u7247" }) }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "columns-2 gap-4 sm:columns-3 lg:columns-3 xl:columns-4 [&>*]:mb-4", children: items.map((img, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 6) * 55}ms` }, children: _jsx(GalleryTile, { image: img, onOpen: () => openAt(i) }) }, img.id))) }), _jsxs("div", { className: "mt-10 flex flex-col items-center gap-3", children: [_jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: setPage }), _jsxs("p", { className: "mono text-[11px] text-muted-foreground", children: ["\u7B2C ", page, " / ", Math.max(1, Math.ceil(total / PAGE_SIZE)), " \u9875 \u00B7 \u5171 ", total, " \u5F20"] })] })] }))] })] }) }), _jsx(Drawer, { open: treeOpen, onClose: () => setTreeOpen(false), title: "\u56FE\u7247\u5206\u7C7B", side: "left", width: "max-w-sm", children: areasState.error ? (_jsx(ErrorState, { message: areasState.error, onRetry: areasState.reload })) : (_jsx(AreaTree, { nodes: tree, selectedId: areaId, expanded: expanded, onToggle: toggleExpand, onSelect: select, totalCount: tree.reduce((s, a) => s + a.imageCount, 0) })) }), boxIndex !== null && items[boxIndex] && (_jsx(Lightbox, { items: items, index: boxIndex, onClose: () => setBoxIndex(null), onChange: (next) => setBoxIndex(next) }))] }));
}
/* =============================================================================
 * 分类树
 * ========================================================================== */
function AreaTree({ nodes, selectedId, expanded, onToggle, onSelect, totalCount, depth = 0, }) {
    if (!nodes.length)
        return _jsx("p", { className: "px-1 py-4 text-[12px] text-muted-foreground", children: "\u6682\u65E0\u5206\u7C7B\u6570\u636E" });
    return (_jsxs("ul", { className: cn('flex flex-col gap-0.5', depth > 0 && 'mt-0.5'), children: [depth === 0 && (_jsx("li", { children: _jsxs("button", { onClick: () => onSelect(null), className: cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-[7px] text-left text-[12.5px] transition-all duration-300', selectedId === null ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'), children: [_jsx(Images, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "min-w-0 flex-1 truncate", children: "\u5168\u90E8\u56FE\u7247" }), totalCount !== undefined && _jsx("span", { className: "mono shrink-0 text-[10.5px] opacity-70", children: totalCount })] }) })), nodes.map((node) => {
                const kids = node.children ?? [];
                const isOpen = expanded.includes(node.id);
                const active = selectedId === node.id;
                return (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center", children: [_jsxs("button", { onClick: () => onSelect(node.id), className: cn('flex min-w-0 flex-1 items-center gap-2 rounded-xl py-[7px] pr-2.5 text-left text-[12.5px] transition-all duration-300', depth > 0 ? 'pl-2' : 'pl-2.5', active
                                        ? 'bg-primary/12 font-medium text-primary'
                                        : 'text-foreground/80 hover:bg-white/[0.05] hover:text-foreground'), children: [_jsx("span", { className: "min-w-0 flex-1 truncate", children: node.name }), _jsx("span", { className: cn('mono shrink-0 text-[10.5px]', active ? 'text-primary/80' : 'text-muted-foreground/70'), children: node.imageCount })] }), kids.length > 0 && (_jsx("button", { onClick: () => onToggle(node.id), "aria-label": isOpen ? `收起 ${node.name}` : `展开 ${node.name}`, "aria-expanded": isOpen, className: "ml-0.5 shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", children: _jsx(ChevronDown, { className: cn('h-3.5 w-3.5 transition-transform duration-300', isOpen && 'rotate-180') }) }))] }), kids.length > 0 && isOpen && (_jsx("div", { className: "ml-[13px] border-l border-white/8 pl-2", children: _jsx(AreaTree, { nodes: kids, selectedId: selectedId, expanded: expanded, onToggle: onToggle, onSelect: onSelect, depth: depth + 1 }) }))] }, node.id));
            })] }));
}
/* =============================================================================
 * 单张图片（骨架底色 + 懒加载 + 悬停浮层）
 * ========================================================================== */
function GalleryTile({ image, onOpen }) {
    const [loaded, setLoaded] = useState(false);
    return (_jsxs("button", { onClick: onOpen, className: "group relative block w-full break-inside-avoid overflow-hidden rounded-3xl border border-white/8 bg-white/[0.045] text-left transition-all duration-500 hover:border-primary/30", style: { aspectRatio: ratioOf(image) }, "aria-label": `查看图片：${image.title}`, children: [_jsx("img", { src: image.url, alt: image.title, loading: "lazy", decoding: "async", onLoad: () => setLoaded(true), className: cn('absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.055]', loaded ? 'opacity-100' : 'opacity-0') }), !loaded && (_jsx("span", { "aria-hidden": true, className: "absolute inset-0", style: {
                    backgroundImage: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,.06) 50%, transparent 80%)',
                    backgroundSize: '220% 100%',
                    animation: 'sti-shimmer 1.6s linear infinite',
                } })), _jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-95" }), _jsxs("span", { className: "absolute inset-x-0 bottom-0 translate-y-1.5 p-3.5 transition-transform duration-500 group-hover:translate-y-0", children: [_jsx("span", { className: "clamp-1 block text-[12.5px] font-medium text-white/95", children: image.title }), image.areaName && (_jsx("span", { className: "mono mt-1 block text-[10px] text-white/55", children: image.areaName }))] }), _jsx("span", { className: "lg-thin backdrop-blur-md absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/85 opacity-0 transition-opacity duration-400 group-hover:opacity-100", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) })] }));
}
/* =============================================================================
 * 骨架屏
 * ========================================================================== */
function MasonrySkeleton() {
    return (_jsx("div", { className: "columns-2 gap-4 sm:columns-3 xl:columns-4 [&>*]:mb-4", children: [1.4, 0.95, 1.2, 1.05, 1.5, 0.9, 1.3, 1.1, 1.45, 1, 1.25, 0.92].map((r, i) => (_jsx("div", { className: "w-full break-inside-avoid", style: { aspectRatio: r }, children: _jsx(Skeleton, { className: "h-full w-full rounded-3xl" }) }, i))) }));
}
/* =============================================================================
 * 灯箱
 * ========================================================================== */
const ZOOM_STEP = 0.5;
const ZOOM_MAX = 3;
function Lightbox({ items, index, onClose, onChange, }) {
    useBodyLock(true);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragRef = useRef(null);
    const movedRef = useRef(false);
    const imgRef = useRef(null);
    const offsetRef = useRef(offset);
    const scaleRef = useRef(scale);
    const lastPaintRef = useRef(offset);
    scaleRef.current = scale;
    const commitOffset = useCallback((o) => {
        offsetRef.current = o;
        lastPaintRef.current = o;
        setOffset(o);
    }, []);
    /** 拖拽期间直接写 DOM，避免每帧 setState */
    const paint = useCallback((o, s) => {
        const el = imgRef.current;
        if (!el)
            return;
        el.style.transition = 'none';
        el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0) scale(${s})`;
    }, []);
    const item = items[index];
    const count = items.length;
    const go = useCallback((delta) => {
        if (count < 2)
            return;
        onChange(((index + delta) % count + count) % count);
    }, [count, index, onChange]);
    /* 切换图片时复位缩放与平移 */
    useEffect(() => {
        setScale(1);
        scaleRef.current = 1;
        commitOffset({ x: 0, y: 0 });
        dragRef.current = null;
    }, [index, commitOffset]);
    /* 键盘：← / → 切换，Esc 关闭，+/- 缩放 */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(1);
            }
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(-1);
            }
            else if (e.key === '+' || e.key === '=') {
                setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
            }
            else if (e.key === '-' || e.key === '_') {
                setScale((s) => {
                    const next = Math.max(1, s - ZOOM_STEP);
                    if (next === 1)
                        commitOffset({ x: 0, y: 0 });
                    return next;
                });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go, onClose, commitOffset]);
    const toggleZoom = () => {
        if (scaleRef.current > 1) {
            setScale(1);
            commitOffset({ x: 0, y: 0 });
        }
        else {
            setScale(2);
        }
    };
    const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
    const zoomOut = () => setScale((s) => {
        const next = Math.max(1, s - ZOOM_STEP);
        if (next === 1)
            commitOffset({ x: 0, y: 0 });
        return next;
    });
    const reset = () => {
        setScale(1);
        commitOffset({ x: 0, y: 0 });
    };
    const onPointerDown = (e) => {
        if (scaleRef.current <= 1)
            return;
        movedRef.current = false;
        dragRef.current = { px: e.clientX, py: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        setDragging(true);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        catch {
            /* 合成的指针事件不支持捕获，忽略即可 */
        }
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d)
            return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3)
            movedRef.current = true;
        /* 拖拽期间只写 DOM，松手时才提交 state（避免高频 setState） */
        const next = { x: d.ox + dx, y: d.oy + dy };
        lastPaintRef.current = next;
        paint(next, scaleRef.current);
    };
    const onPointerUp = (e) => {
        if (dragRef.current) {
            dragRef.current = null;
            setDragging(false);
            commitOffset(lastPaintRef.current);
        }
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
        }
        catch {
            /* ignore */
        }
    };
    const onImageClick = () => {
        if (movedRef.current) {
            movedRef.current = false;
            return;
        }
        toggleZoom();
    };
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-[100] flex flex-col", role: "dialog", "aria-modal": "true", "aria-label": "\u56FE\u7247\u67E5\u770B\u5668", children: [_jsx("div", { className: "absolute inset-0 bg-black/92 backdrop-blur-xl", style: { animation: 'sti-fade .25s ease both' }, onClick: onClose }), _jsxs("div", { className: "relative z-20 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6", children: [_jsxs(Glass, { tone: "thin", className: "flex items-center gap-3 px-3.5 py-2", children: [_jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: [index + 1, " / ", count] }), item.areaName && _jsx("span", { className: "chip !px-2 !py-0.5 !text-[10.5px]", children: item.areaName })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "icon-sm", variant: "glass", onClick: zoomOut, disabled: scale <= 1, "aria-label": "\u7F29\u5C0F", children: _jsx(Minus, { className: "h-3.5 w-3.5" }) }), _jsxs("span", { className: "mono hidden w-12 text-center text-[11px] text-muted-foreground sm:block", children: [Math.round(scale * 100), "%"] }), _jsx(Button, { size: "icon-sm", variant: "glass", onClick: zoomIn, disabled: scale >= ZOOM_MAX, "aria-label": "\u653E\u5927", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "icon-sm", variant: "glass", onClick: reset, "aria-label": "\u8FD8\u539F\u7F29\u653E", children: _jsx(RotateCcw, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { size: "icon-sm", variant: "glass", onClick: onClose, "aria-label": "\u5173\u95ED", children: _jsx(X, { className: "h-3.5 w-3.5" }) })] })] }), _jsxs("div", { className: "relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-6", children: [scale === 1 && count > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => go(-1), "aria-label": "\u4E0A\u4E00\u5F20", className: "group absolute left-0 top-0 z-20 flex h-full w-[18%] cursor-w-resize items-center justify-start pl-3", children: _jsx("span", { className: "lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }) }), _jsx("button", { onClick: () => go(1), "aria-label": "\u4E0B\u4E00\u5F20", className: "group absolute right-0 top-0 z-20 flex h-full w-[18%] cursor-e-resize items-center justify-end pr-3", children: _jsx("span", { className: "lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100", children: _jsx(ChevronRight, { className: "h-4 w-4" }) }) })] })), _jsx("div", { className: "flex h-full w-full items-center justify-center", style: { animation: 'sti-pop .4s cubic-bezier(.22,1,.36,1) both' }, children: _jsx("img", { ref: imgRef, src: item.url, alt: item.title, loading: "lazy", decoding: "async", draggable: false, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onClick: onImageClick, className: cn('max-h-full max-w-full touch-none select-none rounded-2xl object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]', scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'), style: {
                                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                                transition: dragging ? 'none' : 'transform .32s cubic-bezier(.22,1,.36,1)',
                            } }) }, item.id)] }), _jsx("div", { className: "relative z-20 px-4 pb-5 pt-3 sm:px-6", children: _jsxs(Glass, { tone: "strong", className: "mx-auto flex max-w-3xl flex-col gap-3 p-5", children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-[15px] font-semibold", children: item.title }), _jsx("p", { className: "mt-1.5 text-[13px] leading-relaxed text-muted-foreground", children: item.description || '暂无图片描述。' })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2.5", children: [_jsx(Button, { size: "icon-sm", variant: "glass", onClick: () => go(-1), disabled: count < 2, "aria-label": "\u4E0A\u4E00\u5F20", children: _jsx(ChevronLeft, { className: "h-3.5 w-3.5" }) }), _jsxs("span", { className: "mono whitespace-nowrap text-[12px] text-muted-foreground", children: ["\u7B2C ", _jsx("span", { className: "text-foreground", children: index + 1 }), " / \u5171 ", count, " \u5F20"] }), _jsx(Button, { size: "icon-sm", variant: "glass", onClick: () => go(1), disabled: count < 2, "aria-label": "\u4E0B\u4E00\u5F20", children: _jsx(ChevronRight, { className: "h-3.5 w-3.5" }) })] })] }), _jsxs("p", { className: "mono border-t border-white/8 pt-3 text-[10.5px] text-muted-foreground/70", children: ["\u533A\u57DF\uFF1A", item.areaName ?? '未分类', " \u00B7 \u2190 / \u2192 \u5207\u6362 \u00B7 Esc \u5173\u95ED \u00B7 \u70B9\u51FB\u56FE\u7247\u653E\u5927\u6216\u8FD8\u539F \u00B7 \u653E\u5927\u540E\u53EF\u62D6\u62FD\u5E73\u79FB"] })] }) })] }), document.body);
}
