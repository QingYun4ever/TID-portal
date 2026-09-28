import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  FolderPlus,
  FolderTree,
  GripVertical,
  Image as ImageIcon,
  Images,
  Info,
  Layers,
  Maximize2,
  Move,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useDebounced, useEscape, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { cn, fdatetime, fnum } from '@/lib/utils';
import {
  Button,
  Chip,
  ConfirmDialog,
  Drawer,
  ErrorState,
  Field,
  Glass,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { AdminPage, MultiImageUpload, StatTile } from '@/components/AdminKit';

/* =============================================================================
 * 类型
 * ========================================================================== */
interface AreaRow {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  description: string | null;
  sortOrder: number;
}

interface AreaNode extends AreaRow {
  children: AreaNode[];
  depth: number;
  ownCount: number;
  totalCount: number;
}

interface GalleryImage {
  id: number;
  areaId: number;
  url: string;
  title: string;
  description: string | null;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
  areaName?: string | null;
}

const PAGE_SIZE = 24;
const AREA_LIST_PARAMS = { page: 1, pageSize: 100 };

/* =============================================================================
 * 活动画廊管理 /admin/gallery
 * ========================================================================== */
export default function AdminGallery() {
  useTitle('活动画廊管理');
  const toast = useToast();

  /* ------------------------------- 区域 ------------------------------- */
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaKey, setAreaKey] = useState(0);

  /* ------------------------------- 图片 ------------------------------- */
  const [areaId, setAreaId] = useState<'all' | number>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgKey, setImgKey] = useState(0);

  /** 全量图片：用于区域计数与总数统计 */
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  /* ------------------------------- 交互状态 ------------------------------- */
  const [selected, setSelected] = useState<number[]>([]);
  const [batching, setBatching] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [confirmBatchDel, setConfirmBatchDel] = useState(false);
  const [confirmAreaDel, setConfirmAreaDel] = useState<AreaNode | null>(null);
  const [confirmImgDel, setConfirmImgDel] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [areaForm, setAreaForm] = useState<{
    open: boolean;
    editing: AreaNode | null;
    name: string;
    parentId: string;
    description: string;
    sortOrder: string;
  }>({ open: false, editing: null, name: '', parentId: '', description: '', sortOrder: '0' });
  const [areaSaving, setAreaSaving] = useState(false);

  const [editImg, setEditImg] = useState<GalleryImage | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; areaId: string; sortOrder: string }>({
    title: '',
    description: '',
    areaId: '',
    sortOrder: '0',
  });
  const [savingImg, setSavingImg] = useState(false);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  /* ---------------------------------------------------------------------- */
  /*  数据加载                                                               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let alive = true;
    setAreasLoading(true);
    AdminApi.resource('gallery/areas')
      .list(AREA_LIST_PARAMS)
      .then((res) => {
        if (!alive) return;
        setAreas((res.data?.items ?? []) as AreaRow[]);
        setAreasError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setAreasError(e?.message || '区域加载失败');
        setAreas([]);
      })
      .finally(() => alive && setAreasLoading(false));
    return () => {
      alive = false;
    };
  }, [areaKey]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    AdminApi.galleryImages({ page, pageSize: PAGE_SIZE, areaId: areaId === 'all' ? 'all' : areaId, q })
      .then((res) => {
        if (!alive) return;
        setImages((res.data?.items ?? []) as GalleryImage[]);
        setTotal(Number(res.data?.total ?? 0));
        setError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || '加载失败');
        setImages([]);
        setTotal(0);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, areaId, q, imgKey]);

  useEffect(() => {
    let alive = true;
    setAllLoading(true);
    (async () => {
      try {
        const first = await AdminApi.galleryImages({ page: 1, pageSize: 100, areaId: 'all' });
        const all = Number(first.data?.total ?? 0);
        let items = (first.data?.items ?? []) as GalleryImage[];
        const pages = Math.min(30, Math.ceil(all / 100));
        for (let p = 2; p <= pages; p++) {
          const next = await AdminApi.galleryImages({ page: p, pageSize: 100, areaId: 'all' });
          items = items.concat((next.data?.items ?? []) as GalleryImage[]);
        }
        if (alive) setAllImages(items);
      } catch {
        /* 统计失败不阻塞主流程 */
      } finally {
        if (alive) setAllLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [imgKey, areaKey]);

  /* ---------------------------------------------------------------------- */
  /*  派生数据                                                               */
  /* ---------------------------------------------------------------------- */
  const ownCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const img of allImages) m.set(img.areaId, (m.get(img.areaId) ?? 0) + 1);
    return m;
  }, [allImages]);

  const flatAreas = useMemo(() => {
    const ids = new Set(areas.map((a) => a.id));
    const byParent = new Map<number | null, AreaRow[]>();
    for (const a of areas) {
      const key = a.parentId !== null && ids.has(a.parentId) ? a.parentId : null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(a);
    }
    for (const list of byParent.values()) list.sort((x, y) => x.sortOrder - y.sortOrder || x.id - y.id);

    const flat: AreaNode[] = [];
    const walk = (parentId: number | null, depth: number): AreaNode[] =>
      (byParent.get(parentId) ?? []).map((a) => {
        const own = ownCounts.get(a.id) ?? 0;
        const children = walk(a.id, depth + 1);
        const node: AreaNode = {
          ...a,
          depth,
          ownCount: own,
          totalCount: own + children.reduce((s, c) => s + c.totalCount, 0),
          children,
        };
        flat.push(node);
        return node;
      });
    const tree = walk(null, 0);
    return { tree, flat };
  }, [areas, ownCounts]);

  const currentArea = useMemo(
    () => (areaId === 'all' ? null : flatAreas.flat.find((a) => a.id === areaId) ?? null),
    [flatAreas, areaId]
  );

  const lightboxItem = lightbox.open ? images[lightbox.index] ?? null : null;

  const refreshAreas = useCallback(() => setAreaKey((k) => k + 1), []);
  const refreshImages = useCallback(() => setImgKey((k) => k + 1), []);

  const totalCount = allImages.length;
  const unassignedCount = useMemo(() => {
    const ids = new Set(areas.map((a) => a.id));
    return allImages.filter((i) => !ids.has(i.areaId)).length;
  }, [allImages, areas]);

  const orderEnabled = areaId !== 'all' && !q && images.length > 1;

  /* ---------------------------------------------------------------------- */
  /*  区域 CRUD                                                              */
  /* ---------------------------------------------------------------------- */
  const openAreaCreate = (parent: AreaNode | null) => {
    setAreaForm({
      open: true,
      editing: null,
      name: '',
      parentId: parent ? String(parent.id) : '',
      description: '',
      sortOrder: '0',
    });
  };

  const openAreaEdit = (node: AreaNode) => {
    setAreaForm({
      open: true,
      editing: node,
      name: node.name,
      parentId: node.parentId === null ? '' : String(node.parentId),
      description: node.description ?? '',
      sortOrder: String(node.sortOrder ?? 0),
    });
  };

  const saveArea = async () => {
    const name = areaForm.name.trim();
    if (!name) {
      toast.error('请填写区域名称');
      return;
    }
    setAreaSaving(true);
    try {
      const api = AdminApi.resource('gallery/areas');
      const payload: Record<string, unknown> = {
        name,
        parentId: areaForm.parentId ? Number(areaForm.parentId) : null,
        description: areaForm.description.trim() || null,
        sortOrder: Number(areaForm.sortOrder) || 0,
      };
      if (areaForm.editing) await api.update(areaForm.editing.id, payload);
      else await api.create(payload);
      toast.success(areaForm.editing ? '区域已更新' : '区域已创建', name);
      setAreaForm((f) => ({ ...f, open: false }));
      refreshAreas();
      refreshImages();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setAreaSaving(false);
    }
  };

  const removeArea = async () => {
    if (!confirmAreaDel) return;
    setDeleting(true);
    try {
      await AdminApi.resource('gallery/areas').remove(confirmAreaDel.id);
      toast.success('区域已删除', confirmAreaDel.name);
      if (areaId === confirmAreaDel.id) setAreaId('all');
      setConfirmAreaDel(null);
      refreshAreas();
      refreshImages();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  图片操作                                                               */
  /* ---------------------------------------------------------------------- */
  const toggleSelect = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectAllOnPage = () => {
    const ids = images.map((i) => i.id);
    setSelected((s) =>
      ids.every((id) => s.includes(id)) ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]
    );
  };

  const uploads = async (urls: string[]) => {
    if (!urls.length) return;
    if (areaId === 'all') {
      toast.error('请先选择目标区域', '上传前需要在左侧选择一个具体的画廊区域');
      return;
    }
    try {
      const res = await AdminApi.addGalleryImages({ areaId, urls });
      toast.success(`已添加到「${currentArea?.name ?? '当前区域'}」`, `共 ${res?.count ?? urls.length} 张图片`);
      refreshImages();
      refreshAreas();
    } catch (e: any) {
      toast.error('添加图片失败', e.message);
    }
  };

  const submitOrder = async (ordered: GalleryImage[]) => {
    if (ordered.length < 2) return;
    try {
      await AdminApi.batchGallery({
        ids: ordered.map((i) => i.id),
        action: 'order',
        order: ordered.map((i) => i.id),
      });
      toast.success('排序已保存', `${ordered.length} 张图片`);
      refreshImages();
    } catch (e: any) {
      toast.error('排序保存失败', e.message);
    }
  };

  const moveBy = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= images.length) return;
    const list = images.slice();
    const [item] = list.splice(index, 1);
    list.splice(next, 0, item);
    setImages(list);
    await submitOrder(list);
  };

  const onDrop = async (targetId: number) => {
    setDragOverId(null);
    const sourceId = dragId;
    setDragId(null);
    if (!sourceId || sourceId === targetId) return;
    const list = images.slice();
    const from = list.findIndex((i) => i.id === sourceId);
    const to = list.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    setImages(list);
    await submitOrder(list);
  };

  const batchMove = async () => {
    if (!moveTarget) {
      toast.error('请选择目标区域');
      return;
    }
    await moveSelectedToArea(Number(moveTarget), true);
  };

  const moveSelectedToArea = async (targetAreaId: number, closeModal = false) => {
    if (!selected.length) return;
    setBatching(true);
    try {
      await AdminApi.batchGallery({ ids: selected, action: 'move', areaId: targetAreaId });
      const name = flatAreas.flat.find((a) => a.id === targetAreaId)?.name ?? '目标区域';
      toast.success('已移动图片', `${selected.length} 张 → ${name}`);
      setSelected([]);
      if (closeModal) setMoveOpen(false);
      refreshAreas();
      refreshImages();
    } catch (e: any) {
      toast.error('移动失败', e.message);
    } finally {
      setBatching(false);
    }
  };

  const batchDelete = async () => {
    setBatching(true);
    try {
      await AdminApi.batchGallery({ ids: selected, action: 'delete' });
      toast.success('已批量删除', `${selected.length} 张图片`);
      setSelected([]);
      setConfirmBatchDel(false);
      refreshAreas();
      refreshImages();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setBatching(false);
    }
  };

  const openImageEdit = (img: GalleryImage) => {
    setEditImg(img);
    setEditForm({
      title: img.title ?? '',
      description: img.description ?? '',
      areaId: String(img.areaId),
      sortOrder: String(img.sortOrder ?? 0),
    });
  };

  const saveImage = async () => {
    if (!editImg) return;
    if (!editForm.areaId) {
      toast.error('请选择所属区域');
      return;
    }
    setSavingImg(true);
    try {
      await AdminApi.updateGalleryImage(editImg.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        areaId: Number(editForm.areaId),
        sortOrder: Number(editForm.sortOrder) || 0,
      });
      toast.success('图片信息已保存');
      setEditImg(null);
      refreshImages();
      refreshAreas();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setSavingImg(false);
    }
  };

  const removeImage = async () => {
    if (!confirmImgDel) return;
    setDeleting(true);
    try {
      await AdminApi.deleteGalleryImage(confirmImgDel.id);
      toast.success('图片已删除');
      setConfirmImgDel(null);
      refreshImages();
      refreshAreas();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  灯箱键盘控制                                                           */
  /* ---------------------------------------------------------------------- */
  const closeLightbox = useCallback(() => setLightbox({ open: false, index: 0 }), []);
  useEscape(closeLightbox, lightbox.open);

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLightbox((s) => ({ ...s, index: s.index > 0 ? s.index - 1 : images.length - 1 }));
      else if (e.key === 'ArrowRight')
        setLightbox((s) => ({ ...s, index: s.index < images.length - 1 ? s.index + 1 : 0 }));
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox.open, images.length, closeLightbox]);

  /* ---------------------------------------------------------------------- */
  /*  渲染                                                                   */
  /* ---------------------------------------------------------------------- */
  const TreeRow = ({ node }: { node: AreaNode }) => {
    const active = areaId === node.id;
    return (
      <div
        className="group relative"
        style={{ paddingLeft: `${node.depth * 14}px` }}
        onDragOver={(e) => {
          if (dragId) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!dragId) return;
          e.preventDefault();
          void moveSelectedToArea(node.id);
        }}
      >
        <button
          onClick={() => {
            setAreaId(node.id);
            setPage(1);
            setSelected([]);
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-all duration-200',
            active
              ? 'border-primary/45 bg-primary/[0.12] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
              : 'border-transparent text-foreground/80 hover:border-white/10 hover:bg-white/[0.055]'
          )}
        >
          {node.children.length ? (
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
          ) : (
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-white/25')} />
          )}
          <span className="clamp-1 min-w-0 flex-1 font-medium">{node.name}</span>
          <span
            className={cn(
              'mono shrink-0 rounded-full px-1.5 py-0.5 text-[10px]',
              active ? 'bg-primary/18 text-primary' : 'bg-white/8 text-muted-foreground'
            )}
          >
            {node.totalCount}
          </span>
        </button>

        <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-black/65 p-0.5 backdrop-blur group-hover:flex">
          <IconMini icon={Plus} label="新增子区域" onClick={() => openAreaCreate(node)} />
          <IconMini icon={Pencil} label="编辑区域" onClick={() => openAreaEdit(node)} />
          <IconMini icon={Trash2} label="删除区域" tone="danger" onClick={() => setConfirmAreaDel(node)} />
        </div>
      </div>
    );
  };

  return (
    <AdminPage
      title="活动画廊"
      breadcrumb="后台管理 · 站点建设"
      icon={<Images className="h-5 w-5" />}
      description="多层级区域管理、批量上传与跨区移动、拖动排序、灯箱预览与图片信息编辑。"
      actions={
        <>
          <Button
            variant="glass"
            onClick={() => {
              refreshAreas();
              refreshImages();
            }}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button variant="primary" onClick={() => openAreaCreate(null)}>
            <FolderPlus className="h-4 w-4" />
            新建区域
          </Button>
        </>
      }
    >
      {/* ------------------------------- 统计 ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-reveal>
        <StatTile
          label="区域总数"
          value={areasLoading ? '…' : fnum(areas.length)}
          hint="含所有层级子区域"
          tone="primary"
          icon={<FolderTree className="h-4 w-4" />}
        />
        <StatTile
          label="图片总数"
          value={allLoading ? '…' : fnum(totalCount)}
          hint="全站画廊图片"
          tone="accent"
          icon={<ImageIcon className="h-4 w-4" />}
        />
        <StatTile
          label="顶级区域"
          value={areasLoading ? '…' : fnum(flatAreas.tree.length)}
          hint={`子区域 ${fnum(Math.max(0, areas.length - flatAreas.tree.length))} 个`}
          tone="success"
          icon={<Layers className="h-4 w-4" />}
        />
        <StatTile
          label="当前视图"
          value={fnum(total)}
          hint={currentArea ? `${currentArea.name} · 含子区域 ${fnum(currentArea.totalCount)} 张` : '全部图片（按排序号升序）'}
          tone="warning"
          icon={<Images className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" data-reveal>
        {/* ============================ 左：区域树 ============================ */}
        <div className="flex flex-col gap-4">
          <Glass tone="soft" className="flex flex-col p-4 lg:sticky lg:top-[92px] lg:max-h-[calc(100dvh-130px)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[13px] font-medium">
                <FolderTree className="h-4 w-4 text-primary" />
                区域树
              </p>
              <button
                onClick={() => openAreaCreate(null)}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                title="新建顶级区域"
                aria-label="新建顶级区域"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
              <button
                onClick={() => {
                  setAreaId('all');
                  setPage(1);
                  setSelected([]);
                }}
                className={cn(
                  'mb-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-all duration-200',
                  areaId === 'all'
                    ? 'border-primary/45 bg-primary/[0.12] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                    : 'border-transparent text-foreground/80 hover:border-white/10 hover:bg-white/[0.055]'
                )}
              >
                <Images className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 font-medium">全部图片</span>
                <span
                  className={cn(
                    'mono rounded-full px-1.5 py-0.5 text-[10px]',
                    areaId === 'all' ? 'bg-primary/18 text-primary' : 'bg-white/8 text-muted-foreground'
                  )}
                >
                  {allLoading ? '…' : totalCount}
                </span>
              </button>

              {areasLoading ? (
                <div className="flex flex-col gap-2 pt-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9" />
                  ))}
                </div>
              ) : areasError ? (
                <p className="px-2 py-6 text-[12px] leading-relaxed text-[hsl(var(--destructive))]">{areasError}</p>
              ) : flatAreas.flat.length ? (
                <div className="flex flex-col gap-0.5">
                  {flatAreas.flat.map((node) => (
                    <TreeRow key={node.id} node={node} />
                  ))}
                </div>
              ) : (
                <div className="px-2 py-8 text-center">
                  <ImageIcon className="mx-auto mb-3 h-7 w-7 text-muted-foreground/70" />
                  <p className="text-[12px] text-muted-foreground">还没有画廊区域</p>
                  <Button variant="glass" size="sm" className="mt-4" onClick={() => openAreaCreate(null)}>
                    <Plus className="h-3.5 w-3.5" />
                    新建第一个区域
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-start gap-2 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>hover 每行右侧可编辑 / 新增子区域 / 删除；把图片卡片拖到区域行上可直接跨区移动。删除区域会级联删除其下图片。</span>
            </div>
          </Glass>

          {!!unassignedCount && (
            <Glass tone="soft" className="flex items-start gap-2.5 p-4 text-[12px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
              <span>
                有 <span className="mono text-foreground">{unassignedCount}</span> 张图片的所属区域已不存在，请在「全部图片」中重新归类。
              </span>
            </Glass>
          )}
        </div>

        {/* ============================ 右：图片区 ============================ */}
        <div className="flex min-w-0 flex-col gap-4">
          <Glass tone="soft" className="flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[190px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索图片标题 / 描述…"
                className="pl-10"
              />
            </div>

            <span className="mono hidden text-[11px] text-muted-foreground sm:inline">
              {currentArea ? currentArea.name : '全部图片'} · {fnum(total)} 张
            </span>

            <Button variant="glass" size="sm" onClick={selectAllOnPage} disabled={!images.length}>
              <Check className="h-3.5 w-3.5" />
              {images.length && images.every((i) => selected.includes(i.id)) ? '取消全选' : '全选本页'}
            </Button>
          </Glass>

          {selected.length > 0 && (
            <Glass tone="strong" className="flex flex-wrap items-center gap-2.5 p-3">
              <Chip tone="primary" className="!px-3 !py-1">
                已选 {selected.length} 张
              </Chip>
              <Button size="sm" variant="glass" onClick={() => setMoveOpen(true)} disabled={batching}>
                <Move className="h-3.5 w-3.5" />
                移动到区域
              </Button>
              <Button size="sm" variant="glass" onClick={() => setConfirmBatchDel(true)} disabled={batching}>
                <Trash2 className="h-3.5 w-3.5" />
                批量删除
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])} disabled={batching}>
                <X className="h-3.5 w-3.5" />
                取消选择
              </Button>
            </Glass>
          )}

          <Glass tone="soft" className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[13px] font-medium">
                <Upload className="h-4 w-4 text-primary" />
                批量上传
                {currentArea && <span className="text-muted-foreground">→ {currentArea.name}</span>}
              </p>
              {orderEnabled && (
                <span className="mono flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <GripVertical className="h-3.5 w-3.5" />
                  拖动卡片或使用 ↑↓ 排序
                </span>
              )}
            </div>
            {areaId === 'all' ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                <span>请先在左侧选择一个具体的区域，上传的图片会加入该区域；也可以先「新建区域」。</span>
              </div>
            ) : (
              <MultiImageUpload onUploaded={(urls) => void uploads(urls)} />
            )}
          </Glass>

          {error ? (
            <Glass tone="soft">
              <ErrorState message={error} onRetry={refreshImages} />
            </Glass>
          ) : loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : images.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {images.map((img, idx) => {
                  const isSel = selected.includes(img.id);
                  return (
                    <div
                      key={img.id}
                      draggable={orderEnabled}
                      onDragStart={() => orderEnabled && setDragId(img.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverId(null);
                      }}
                      onDragOver={(e) => {
                        if (!orderEnabled || dragId === null) return;
                        e.preventDefault();
                        if (dragOverId !== img.id) setDragOverId(img.id);
                      }}
                      onDrop={(e) => {
                        if (!orderEnabled) return;
                        e.preventDefault();
                        void onDrop(img.id);
                      }}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl border transition-all duration-300',
                        isSel ? 'border-primary/55 shadow-[0_0_0_1px_hsl(var(--primary)/.35)]' : 'border-white/8 hover:border-white/20',
                        dragOverId === img.id && dragId !== img.id && 'ring-2 ring-primary/60',
                        dragId === img.id && 'opacity-45'
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.04]">
                        <img
                          src={img.url}
                          alt={img.title || '画廊图片'}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />

                        <div className="absolute inset-0 flex flex-col justify-between bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                          <div className="flex items-start justify-between gap-2 p-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(img.id);
                              }}
                              aria-label={isSel ? '取消选择' : '选择'}
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-lg border transition',
                                isSel ? 'border-primary bg-primary' : 'border-white/35 bg-black/35 hover:border-white/60'
                              )}
                            >
                              {isSel && <Check className="h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]" strokeWidth={3.2} />}
                            </button>
                            <span className="flex items-center gap-1">
                              <IconMini
                                icon={ArrowUp}
                                label="上移"
                                overlay
                                disabled={idx === 0 || !orderEnabled}
                                onClick={() => void moveBy(idx, -1)}
                              />
                              <IconMini
                                icon={ArrowDown}
                                label="下移"
                                overlay
                                disabled={idx === images.length - 1 || !orderEnabled}
                                onClick={() => void moveBy(idx, 1)}
                              />
                            </span>
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setLightbox({ open: true, index: idx })}
                              className="lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:scale-105"
                              title="放大预览"
                              aria-label="放大预览"
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openImageEdit(img)}
                              className="lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:scale-105"
                              title="编辑信息"
                              aria-label="编辑信息"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmImgDel(img)}
                              className="lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--destructive))] transition hover:scale-105"
                              title="删除图片"
                              aria-label="删除图片"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="p-2.5 text-[10px] text-white/95">
                            <p className="clamp-1">{img.title || '未命名图片'}</p>
                            <p className="mono mt-0.5 text-white/70">
                              {img.areaName ?? '未知区域'} · {img.width}×{img.height}
                            </p>
                          </div>
                        </div>

                        {isSel && (
                          <span className="pointer-events-none absolute left-2.5 top-2.5 h-6 w-6 rounded-lg border border-primary bg-primary/90 shadow-[0_0_14px_-2px_hsl(var(--primary)/.7)]" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="clamp-1 text-[12px] text-foreground/90">{img.title || '未命名图片'}</p>
                          <p className="mono clamp-1 text-[10px] text-muted-foreground">
                            #{img.id} · {img.areaName ?? '—'}
                          </p>
                        </div>
                        {orderEnabled && <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/70" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  共 <span className="mono text-foreground">{total}</span> 张 · 第 {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页
                  {selected.length ? ` · 已选 ${selected.length} 张` : ''}
                </p>
                <div className="flex items-center gap-3">
                  {orderEnabled && (
                    <Button variant="glass" size="sm" onClick={() => void submitOrder(images)} title="把当前页顺序写回排序号">
                      <Save className="h-3.5 w-3.5" />
                      保存当前顺序
                    </Button>
                  )}
                  <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                </div>
              </div>
            </>
          ) : (
            <Glass tone="soft">
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <ImageIcon className="mb-4 h-8 w-8 text-muted-foreground/70" />
                <h3 className="text-base font-medium">{q ? '没有匹配的图片' : '该区域还没有图片'}</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {q ? '换个关键词搜索，或清空搜索框查看全部图片。' : '在上方上传区拖入图片即可批量添加到当前区域。'}
                </p>
                {q && (
                  <Button variant="glass" size="sm" className="mt-5" onClick={() => setSearch('')}>
                    清空搜索
                  </Button>
                )}
              </div>
            </Glass>
          )}
        </div>
      </div>

      {/* ============================ 区域表单 ============================ */}
      <Modal
        open={areaForm.open}
        onClose={() => setAreaForm((f) => ({ ...f, open: false }))}
        title={areaForm.editing ? '编辑区域' : '新建区域'}
        description="区域支持多层级嵌套，门户画廊会按层级展示筛选项。"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAreaForm((f) => ({ ...f, open: false }))} disabled={areaSaving}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void saveArea()} loading={areaSaving}>
              保存
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="区域名称" required hint="例如「第四届校园科技文化节」。">
            <Input
              value={areaForm.name}
              onChange={(e) => setAreaForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入区域名称"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="上级区域" hint="留空表示顶级区域。">
              <Select value={areaForm.parentId} onChange={(e) => setAreaForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">顶级区域</option>
                {flatAreas.flat
                  .filter(
                    (a) => !areaForm.editing || (a.id !== areaForm.editing.id && !isDescendant(flatAreas.flat, a.id, areaForm.editing.id))
                  )
                  .map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {'　'.repeat(a.depth)}
                      {a.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="排序" hint="数字越小越靠前。">
              <Input
                type="number"
                value={areaForm.sortOrder}
                onChange={(e) => setAreaForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="区域描述" hint="展示在门户画廊的区域说明，可留空。">
            <Textarea
              rows={3}
              value={areaForm.description}
              onChange={(e) => setAreaForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="简要描述该区域收录的内容"
            />
          </Field>

          {areaForm.editing && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-[12px] leading-relaxed text-muted-foreground">
              <p>
                该区域下有 <span className="mono text-foreground">{areaForm.editing.totalCount}</span> 张图片（子区域{' '}
                <span className="mono text-foreground">{areaForm.editing.children.length}</span> 个 · 本层{' '}
                <span className="mono text-foreground">{areaForm.editing.ownCount}</span> 张）。
              </p>
              <p className="mono mt-1 text-[11px] opacity-80">slug · {areaForm.editing.slug}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ============================ 移动到区域 ============================ */}
      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="移动到区域"
        description={`将选中的 ${selected.length} 张图片移动到目标区域。`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMoveOpen(false)} disabled={batching}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void batchMove()} loading={batching} disabled={!moveTarget}>
              确认移动
            </Button>
          </>
        }
      >
        <Field label="目标区域" required>
          <Select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
            <option value="">请选择目标区域…</option>
            {flatAreas.flat.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {'　'.repeat(a.depth)}
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          移动后图片会追加到目标区域末尾。也可以直接把图片卡片拖到左侧区域行上完成跨区移动。
        </p>
      </Modal>

      {/* ============================ 图片信息编辑 ============================ */}
      <Drawer
        open={!!editImg}
        onClose={() => setEditImg(null)}
        title="编辑图片信息"
        width="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditImg(null)} disabled={savingImg}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void saveImage()} loading={savingImg}>
              保存修改
            </Button>
          </div>
        }
      >
        {editImg ? (
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-2xl border border-white/8">
              <img src={editImg.url} alt={editImg.title || '画廊图片'} className="aspect-[4/3] w-full object-cover" />
            </div>

            <Field label="标题">
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="图片标题" />
            </Field>

            <Field label="描述">
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="图片说明，可留空"
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="所属区域" required>
                <Select value={editForm.areaId} onChange={(e) => setEditForm((f) => ({ ...f, areaId: e.target.value }))}>
                  {flatAreas.flat.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {'　'.repeat(a.depth)}
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="排序号" hint="数字越小越靠前。">
                <Input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-[11px] leading-relaxed text-muted-foreground">
              <p className="mono break-all">URL · {editImg.url}</p>
              <p className="mono mt-1">
                尺寸 · {editImg.width}×{editImg.height} · 上传于 {fdatetime(editImg.createdAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
      </Drawer>

      {/* ============================ 灯箱预览 ============================ */}
      {lightbox.open && lightboxItem && (
        <div className="fixed inset-0 z-[95] flex flex-col">
          <div className="scrim-deep absolute inset-0 backdrop-blur-md" onClick={closeLightbox} style={{ animation: 'sti-fade .25s ease both' }} />

          <div
            className="relative z-10 flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5"
            style={{ animation: 'sti-fade .3s ease both' }}
          >
            <div className="min-w-0">
              <p className="clamp-1 text-[13px] font-medium">{lightboxItem.title || '未命名图片'}</p>
              <p className="mono text-[11px] text-muted-foreground">
                {lightboxItem.areaName ?? '未知区域'} · {lightbox.index + 1} / {images.length} · {lightboxItem.width}×{lightboxItem.height}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="glass" onClick={() => openImageEdit(lightboxItem)}>
                <Pencil className="h-3.5 w-3.5" />
                编辑信息
              </Button>
              <button
                onClick={closeLightbox}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                aria-label="关闭预览"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center gap-3 p-4 sm:gap-5 sm:p-6">
            <button
              onClick={() => setLightbox((s) => ({ ...s, index: s.index > 0 ? s.index - 1 : images.length - 1 }))}
              className="lg-thin backdrop-blur-md flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:scale-105"
              aria-label="上一张"
              title="上一张（←）"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
              <img
                key={lightboxItem.id}
                src={lightboxItem.url}
                alt={lightboxItem.title || '画廊图片'}
                className="max-h-full max-w-full rounded-2xl border border-white/10 object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]"
                style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
              />
            </div>

            <button
              onClick={() => setLightbox((s) => ({ ...s, index: s.index < images.length - 1 ? s.index + 1 : 0 }))}
              className="lg-thin backdrop-blur-md flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:scale-105"
              aria-label="下一张"
              title="下一张（→）"
            >
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </button>
          </div>

          {lightboxItem.description && (
            <div className="relative z-10 border-t border-white/8 px-5 py-3">
              <p className="mx-auto max-w-3xl text-center text-[12px] leading-relaxed text-muted-foreground">{lightboxItem.description}</p>
            </div>
          )}

          <p className="relative z-10 pb-4 text-center text-[11px] text-muted-foreground/70">← → 切换图片 · Esc 退出预览</p>
        </div>
      )}

      {/* ============================ 删除确认 ============================ */}
      <ConfirmDialog
        open={confirmBatchDel}
        onClose={() => setConfirmBatchDel(false)}
        onConfirm={() => void batchDelete()}
        loading={batching}
        title="批量删除图片"
        confirmText={`删除 ${selected.length} 张`}
        description="删除后这些图片记录会从数据库中移除，且不可恢复。"
      />

      <ConfirmDialog
        open={!!confirmImgDel}
        onClose={() => setConfirmImgDel(null)}
        onConfirm={() => void removeImage()}
        loading={deleting}
        title="删除图片"
        confirmText="确认删除"
        description={
          <>
            该图片将从画廊中移除。
            {confirmImgDel && <span className="mono mt-2 block text-xs text-muted-foreground">{confirmImgDel.title || confirmImgDel.url}</span>}
          </>
        }
      />

      <ConfirmDialog
        open={!!confirmAreaDel}
        onClose={() => setConfirmAreaDel(null)}
        onConfirm={() => void removeArea()}
        loading={deleting}
        title="删除画廊区域"
        confirmText="确认删除"
        description={
          <>
            删除区域会同时删除其下所有子区域与图片（级联删除，不可恢复）。
            {confirmAreaDel && (
              <span className="mono mt-2 block text-xs text-muted-foreground">
                {confirmAreaDel.name} · 图片 {confirmAreaDel.totalCount} 张 · 子区域 {confirmAreaDel.children.length} 个
              </span>
            )}
          </>
        }
      />
    </AdminPage>
  );
}

/* ---------------------------------------------------------------------------
 * 小部件
 * ------------------------------------------------------------------------ */
function IconMini({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
  disabled,
  overlay,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  overlay?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg transition',
        overlay
          ? 'border border-white/12 bg-black/40 text-white/90 hover:border-white/30'
          : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
        tone === 'danger' && 'hover:bg-[hsl(var(--destructive))]/15 hover:text-[hsl(var(--destructive))]',
        disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/** 判断 candidateId 是否为 ancestorId 的后代（防止把区域挂到自己的子树下） */
function isDescendant(flat: { id: number; parentId: number | null }[], candidateId: number, ancestorId: number): boolean {
  let cur = flat.find((a) => a.id === candidateId);
  let guard = 0;
  while (cur && guard++ < 64) {
    if (cur.parentId === null) return false;
    if (cur.parentId === ancestorId) return true;
    cur = flat.find((a) => a.id === cur!.parentId);
  }
  return false;
}
