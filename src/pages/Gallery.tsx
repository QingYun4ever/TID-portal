import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Image as ImageIcon,
  Images,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useBodyLock, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { cn, fnum, seedRand } from '@/lib/utils';
import {
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  Glass,
  PageHero,
  Pagination,
  SearchInput,
  Skeleton,
} from '@/components/ui';

/* =============================================================================
 * 活动画廊 /gallery
 *  - 左侧递归分类树（含子区域图片数）
 *  - 右侧图片瀑布流（CSS columns）+ 分页
 *  - 全屏灯箱：键盘 / 半区点击 / 缩放 / 拖拽平移
 * ========================================================================== */

const PAGE_SIZE = 12;

interface Area {
  id: number;
  name: string;
  description?: string | null;
  imageCount: number;
  children: Area[];
}

interface GalleryImage {
  id: number;
  areaId: number | null;
  url: string;
  title: string;
  description?: string | null;
  width?: number | null;
  height?: number | null;
  areaName?: string | null;
}

/* ---------------------------- 分类树工具函数 ----------------------------- */
function findPath(nodes: Area[], id: number, trail: Area[] = []): Area[] {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.id === id) return next;
    const deeper = findPath(n.children ?? [], id, next);
    if (deeper.length) return deeper;
  }
  return [];
}

/** 图片容器比例：优先真实尺寸，缺失时按 id 生成稳定比例，避免布局抖动 */
function ratioOf(img: GalleryImage) {
  const w = Number(img.width) || 0;
  const h = Number(img.height) || 0;
  if (w > 0 && h > 0) return Math.min(1.6, Math.max(0.62, w / h));
  return 100 / seedRand(String(img.id), 72, 128);
}

/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Gallery() {
  useTitle('活动画廊');

  const [areaId, setAreaId] = useState<number | null>(null);
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput, 320);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [treeOpen, setTreeOpen] = useState(false);
  const [boxIndex, setBoxIndex] = useState<number | null>(null);

  const areasState = useApi<Area[]>(() => PublicApi.galleryAreas(), []);
  const tree = useMemo(() => areasState.data ?? [], [areasState.data]);

  const imagesState = useApi<{ items: GalleryImage[]; total: number }>(
    () => PublicApi.galleryImages({ page, pageSize: PAGE_SIZE, areaId: areaId ?? 'all', q }),
    [page, areaId, q]
  );

  const items = imagesState.data?.items ?? [];
  const total = imagesState.data?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [areaId, q]);

  /* 初始展开有子区域的根节点 */
  useEffect(() => {
    const list = areasState.data;
    if (!list) return;
    setExpanded(list.filter((a) => (a.children ?? []).length > 0).map((a) => a.id));
  }, [areasState.data]);

  const path = useMemo(() => (areaId === null ? [] : findPath(tree, areaId)), [tree, areaId]);
  const pathKey = path.map((p) => p.id).join(',');
  const current = path.length ? path[path.length - 1] : null;
  const parent = path.length > 1 ? path[path.length - 2] : null;

  /* 选中深层区域时自动展开祖先 */
  useEffect(() => {
    if (!path.length) return;
    setExpanded((prev) => Array.from(new Set([...prev, ...path.slice(0, -1).map((n) => n.id)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  /* 数据到位后重新扫描滚动揭示元素 */
  useRevealScan(`gallery-${page}-${areaId}-${q}-${items.length}-${pathKey}`);

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }, []);

  const select = useCallback((id: number | null) => {
    setAreaId(id);
    setTreeOpen(false);
  }, []);

  const openAt = useCallback((index: number) => setBoxIndex(index), []);

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="活动画廊"
        breadcrumb={[{ label: '活动画廊' }]}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Images className="h-3.5 w-3.5 text-primary" />
            全站收录
            <span className="mono text-foreground">{fnum(tree.reduce((s, a) => s + a.imageCount, 0))}</span>
            张影像
          </span>
          <span className="text-white/15">|</span>
          <span className="mono">共 {tree.length} 个一级分类</span>
        </div>
      </PageHero>

      <div className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
          {/* ---------------- 桌面端：递归分类侧栏 ---------------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <Glass tone="soft" className="p-4" data-reveal="left">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  <h2 className="text-[13px] font-semibold">图片分类</h2>
                </div>

                {areasState.loading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-9" />
                    ))}
                  </div>
                ) : areasState.error ? (
                  <ErrorState message={areasState.error} onRetry={areasState.reload} />
                ) : (
                  <AreaTree
                    nodes={tree}
                    selectedId={areaId}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    onSelect={select}
                    totalCount={tree.reduce((s, a) => s + a.imageCount, 0)}
                  />
                )}
              </Glass>
            </div>
          </aside>

          {/* ---------------- 主区 ---------------- */}
          <div className="min-w-0">
            {/* 移动端：横向滚动 chips + 抽屉 */}
            <div className="mb-5 lg:hidden">
              <div className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-1">
                <button
                  onClick={() => select(null)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-300',
                    areaId === null
                      ? 'border-primary/40 bg-primary/14 text-primary'
                      : 'border-white/10 bg-white/[0.045] text-muted-foreground'
                  )}
                >
                  全部图片
                </button>
                {tree.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => select(a.id)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-300',
                      areaId === a.id
                        ? 'border-primary/40 bg-primary/14 text-primary'
                        : 'border-white/10 bg-white/[0.045] text-muted-foreground'
                    )}
                  >
                    {a.name}
                    <span className="mono ml-1.5 text-[10px] opacity-70">{a.imageCount}</span>
                  </button>
                ))}
                <button
                  onClick={() => setTreeOpen(true)}
                  className="chip shrink-0 !px-3.5 !py-1.5 !text-[12px] !text-foreground/85"
                >
                  <FolderTree className="h-3 w-3" />
                  全部分类
                </button>
              </div>
            </div>

            {/* 工具条：区域信息 + 返回上级 + 搜索 */}
            <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" data-reveal>
              <div className="min-w-0">
                <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <button onClick={() => select(null)} className="transition hover:text-foreground">
                    全部分类
                  </button>
                  {path.map((p) => (
                    <React.Fragment key={p.id}>
                      <span className="text-white/20">/</span>
                      <button
                        onClick={() => select(p.id)}
                        className={cn('transition hover:text-foreground', p.id === areaId && 'text-foreground/90')}
                      >
                        {p.name}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                  {current?.name ?? '全部图片'}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  共 <span className="mono text-foreground">{fnum(total)}</span> 张
                  {q ? <> · 搜索「{q}」</> : null}
                  {current?.description ? <> · {current.description}</> : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {parent && (
                  <Button variant="glass" size="sm" onClick={() => select(parent.id)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    返回上级：{parent.name}
                  </Button>
                )}
                {areaId !== null && (
                  <Button variant="ghost" size="sm" onClick={() => select(null)}>
                    返回全部
                  </Button>
                )}
                <SearchInput
                  value={qInput}
                  onChange={setQInput}
                  placeholder="搜索图片标题或描述…"
                  className="w-full sm:w-64"
                />
              </div>
            </div>

            {/* 图片网格 */}
            {imagesState.error ? (
              <Glass tone="soft" className="p-4">
                <ErrorState message={imagesState.error} onRetry={imagesState.reload} />
              </Glass>
            ) : imagesState.loading ? (
              <MasonrySkeleton />
            ) : items.length === 0 ? (
              <Glass tone="soft">
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="没有找到相关图片"
                  description={q ? '换个关键词，或切换其他分类看看。' : '该分类下暂时还没有影像记录。'}
                  action={
                    <Button
                      onClick={() => {
                        setQInput('');
                        select(null);
                      }}
                    >
                      查看全部图片
                    </Button>
                  }
                />
              </Glass>
            ) : (
              <>
                <div className="columns-2 gap-4 sm:columns-3 lg:columns-3 xl:columns-4 [&>*]:mb-4">
                  {items.map((img, i) => (
                    <div key={img.id} data-reveal="scale" style={{ transitionDelay: `${(i % 6) * 55}ms` }}>
                      <GalleryTile image={img} onOpen={() => openAt(i)} />
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center gap-3">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                  <p className="mono text-[11px] text-muted-foreground">
                    第 {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页 · 共 {total} 张
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 移动端分类抽屉 */}
      <Drawer open={treeOpen} onClose={() => setTreeOpen(false)} title="图片分类" side="left" width="max-w-sm">
        {areasState.error ? (
          <ErrorState message={areasState.error} onRetry={areasState.reload} />
        ) : (
          <AreaTree
            nodes={tree}
            selectedId={areaId}
            expanded={expanded}
            onToggle={toggleExpand}
            onSelect={select}
            totalCount={tree.reduce((s, a) => s + a.imageCount, 0)}
          />
        )}
      </Drawer>

      {/* 灯箱 */}
      {boxIndex !== null && items[boxIndex] && (
        <Lightbox
          items={items}
          index={boxIndex}
          onClose={() => setBoxIndex(null)}
          onChange={(next) => setBoxIndex(next)}
        />
      )}
    </>
  );
}

/* =============================================================================
 * 分类树
 * ========================================================================== */
function AreaTree({
  nodes,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  totalCount,
  depth = 0,
}: {
  nodes: Area[];
  selectedId: number | null;
  expanded: number[];
  onToggle: (id: number) => void;
  onSelect: (id: number | null) => void;
  totalCount?: number;
  depth?: number;
}) {
  if (!nodes.length)
    return <p className="px-1 py-4 text-[12px] text-muted-foreground">暂无分类数据</p>;

  return (
    <ul className={cn('flex flex-col gap-0.5', depth > 0 && 'mt-0.5')}>
      {depth === 0 && (
        <li>
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-2.5 py-[7px] text-left text-[12.5px] transition-all duration-300',
              selectedId === null ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground'
            )}
          >
            <Images className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">全部图片</span>
            {totalCount !== undefined && <span className="mono shrink-0 text-[10.5px] opacity-70">{totalCount}</span>}
          </button>
        </li>
      )}

      {nodes.map((node) => {
        const kids = node.children ?? [];
        const isOpen = expanded.includes(node.id);
        const active = selectedId === node.id;
        return (
          <li key={node.id}>
            <div className="flex items-center">
              <button
                onClick={() => onSelect(node.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-xl py-[7px] pr-2.5 text-left text-[12.5px] transition-all duration-300',
                  depth > 0 ? 'pl-2' : 'pl-2.5',
                  active
                    ? 'bg-primary/12 font-medium text-primary'
                    : 'text-foreground/80 hover:bg-white/[0.05] hover:text-foreground'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{node.name}</span>
                <span className={cn('mono shrink-0 text-[10.5px]', active ? 'text-primary/80' : 'text-muted-foreground/70')}>
                  {node.imageCount}
                </span>
              </button>
              {kids.length > 0 && (
                <button
                  onClick={() => onToggle(node.id)}
                  aria-label={isOpen ? `收起 ${node.name}` : `展开 ${node.name}`}
                  aria-expanded={isOpen}
                  className="ml-0.5 shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', isOpen && 'rotate-180')} />
                </button>
              )}
            </div>

            {kids.length > 0 && isOpen && (
              <div className="ml-[13px] border-l border-white/8 pl-2">
                <AreaTree
                  nodes={kids}
                  selectedId={selectedId}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* =============================================================================
 * 单张图片（骨架底色 + 懒加载 + 悬停浮层）
 * ========================================================================== */
function GalleryTile({ image, onOpen }: { image: GalleryImage; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      onClick={onOpen}
      className="group relative block w-full break-inside-avoid overflow-hidden rounded-3xl border border-white/8 bg-white/[0.045] text-left transition-all duration-500 hover:border-primary/30"
      style={{ aspectRatio: ratioOf(image) }}
      aria-label={`查看图片：${image.title}`}
    >
      <img
        src={image.url}
        alt={image.title}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.055]',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
      {!loaded && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,.06) 50%, transparent 80%)',
            backgroundSize: '220% 100%',
            animation: 'sti-shimmer 1.6s linear infinite',
          }}
        />
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-95"
      />
      <span className="absolute inset-x-0 bottom-0 translate-y-1.5 p-3.5 transition-transform duration-500 group-hover:translate-y-0">
        <span className="clamp-1 block text-[12.5px] font-medium text-white/95">{image.title}</span>
        {image.areaName && (
          <span className="mono mt-1 block text-[10px] text-white/55">{image.areaName}</span>
        )}
      </span>
      <span className="lg-thin backdrop-blur-md absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/85 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
        <Plus className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/* =============================================================================
 * 骨架屏
 * ========================================================================== */
function MasonrySkeleton() {
  return (
    <div className="columns-2 gap-4 sm:columns-3 xl:columns-4 [&>*]:mb-4">
      {[1.4, 0.95, 1.2, 1.05, 1.5, 0.9, 1.3, 1.1, 1.45, 1, 1.25, 0.92].map((r, i) => (
        <div key={i} className="w-full break-inside-avoid" style={{ aspectRatio: r }}>
          <Skeleton className="h-full w-full rounded-3xl" />
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
 * 灯箱
 * ========================================================================== */
const ZOOM_STEP = 0.5;
const ZOOM_MAX = 3;

function Lightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: GalleryImage[];
  index: number;
  onClose: () => void;
  onChange: (next: number) => void;
}) {
  useBodyLock(true);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const offsetRef = useRef(offset);
  const scaleRef = useRef(scale);
  const lastPaintRef = useRef(offset);
  scaleRef.current = scale;

  const commitOffset = useCallback((o: { x: number; y: number }) => {
    offsetRef.current = o;
    lastPaintRef.current = o;
    setOffset(o);
  }, []);

  /** 拖拽期间直接写 DOM，避免每帧 setState */
  const paint = useCallback((o: { x: number; y: number }, s: number) => {
    const el = imgRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0) scale(${s})`;
  }, []);

  const item = items[index];
  const count = items.length;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      onChange(((index + delta) % count + count) % count);
    },
    [count, index, onChange]
  );

  /* 切换图片时复位缩放与平移 */
  useEffect(() => {
    setScale(1);
    scaleRef.current = 1;
    commitOffset({ x: 0, y: 0 });
    dragRef.current = null;
  }, [index, commitOffset]);

  /* 键盘：← / → 切换，Esc 关闭，+/- 缩放 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => {
          const next = Math.max(1, s - ZOOM_STEP);
          if (next === 1) commitOffset({ x: 0, y: 0 });
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
    } else {
      setScale(2);
    }
  };

  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(1, s - ZOOM_STEP);
      if (next === 1) commitOffset({ x: 0, y: 0 });
      return next;
    });
  const reset = () => {
    setScale(1);
    commitOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (scaleRef.current <= 1) return;
    movedRef.current = false;
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成的指针事件不支持捕获，忽略即可 */
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    /* 拖拽期间只写 DOM，松手时才提交 state（避免高频 setState） */
    const next = { x: d.ox + dx, y: d.oy + dy };
    lastPaintRef.current = next;
    paint(next, scaleRef.current);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      commitOffset(lastPaintRef.current);
    }
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" role="dialog" aria-modal="true" aria-label="图片查看器">
      <div
        className="scrim-deep absolute inset-0 backdrop-blur-xl"
        style={{ animation: 'sti-fade .25s ease both' }}
        onClick={onClose}
      />

      {/* 顶部工具条 */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Glass tone="thin" className="flex items-center gap-3 px-3.5 py-2">
          <span className="mono text-[11px] text-muted-foreground">
            {index + 1} / {count}
          </span>
          {item.areaName && <span className="chip !px-2 !py-0.5 !text-[10.5px]">{item.areaName}</span>}
        </Glass>

        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="glass" onClick={zoomOut} disabled={scale <= 1} aria-label="缩小">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="mono hidden w-12 text-center text-[11px] text-muted-foreground sm:block">
            {Math.round(scale * 100)}%
          </span>
          <Button size="icon-sm" variant="glass" onClick={zoomIn} disabled={scale >= ZOOM_MAX} aria-label="放大">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="glass" onClick={reset} aria-label="还原缩放">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="glass" onClick={onClose} aria-label="关闭">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 图片区 */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-6">
        {scale === 1 && count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="上一张"
              className="group absolute left-0 top-0 z-20 flex h-full w-[18%] cursor-w-resize items-center justify-start pl-3"
            >
              <span className="lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <ChevronLeft className="h-4 w-4" />
              </span>
            </button>
            <button
              onClick={() => go(1)}
              aria-label="下一张"
              className="group absolute right-0 top-0 z-20 flex h-full w-[18%] cursor-e-resize items-center justify-end pr-3"
            >
              <span className="lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </>
        )}

        {/* 缩放 / 平移由内层 img 的 inline transform 承担；
            入场动画放在外层（sti-pop 的关键帧会覆盖 inline transform，不能同层） */}
        <div
          key={item.id}
          className="flex h-full w-full items-center justify-center"
          style={{ animation: 'sti-pop .4s cubic-bezier(.22,1,.36,1) both' }}
        >
          <img
            ref={imgRef}
            src={item.url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={onImageClick}
            className={cn(
              'max-h-full max-w-full touch-none select-none rounded-2xl object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]',
              scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            )}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transition: dragging ? 'none' : 'transform .32s cubic-bezier(.22,1,.36,1)',
            }}
          />
        </div>
      </div>

      {/* 底部信息 */}
      <div className="relative z-20 px-4 pb-5 pt-3 sm:px-6">
        <Glass tone="strong" className="mx-auto flex max-w-3xl flex-col gap-3 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {item.description || '暂无图片描述。'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <Button size="icon-sm" variant="glass" onClick={() => go(-1)} disabled={count < 2} aria-label="上一张">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="mono whitespace-nowrap text-[12px] text-muted-foreground">
                第 <span className="text-foreground">{index + 1}</span> / 共 {count} 张
              </span>
              <Button size="icon-sm" variant="glass" onClick={() => go(1)} disabled={count < 2} aria-label="下一张">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mono border-t border-white/8 pt-3 text-[10.5px] text-muted-foreground/70">
            区域：{item.areaName ?? '未分类'} · ← / → 切换 · Esc 关闭 · 点击图片放大或还原 · 放大后可拖拽平移
          </p>
        </Glass>
      </div>
    </div>,
    document.body
  );
}
