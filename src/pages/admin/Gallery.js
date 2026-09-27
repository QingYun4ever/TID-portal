import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, FolderPlus, FolderTree, GripVertical, Image as ImageIcon, Images, Info, Layers, Maximize2, Move, Pencil, Plus, RefreshCw, Save, Search, Trash2, Upload, X, } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useDebounced, useEscape, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { cn, fdatetime, fnum } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, Drawer, ErrorState, Field, Glass, Input, Modal, Pagination, Select, Skeleton, Textarea, } from '@/components/ui';
import { AdminPage, MultiImageUpload, StatTile } from '@/components/AdminKit';
const PAGE_SIZE = 24;
const AREA_LIST_PARAMS = { page: 1, pageSize: 100 };
/* =============================================================================
 * 活动画廊管理 /admin/gallery
 * ========================================================================== */
export default function AdminGallery() {
    useTitle('活动画廊管理');
    const toast = useToast();
    /* ------------------------------- 区域 ------------------------------- */
    const [areas, setAreas] = useState([]);
    const [areasLoading, setAreasLoading] = useState(true);
    const [areasError, setAreasError] = useState(null);
    const [areaKey, setAreaKey] = useState(0);
    /* ------------------------------- 图片 ------------------------------- */
    const [areaId, setAreaId] = useState('all');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const q = useDebounced(search, 380);
    const [images, setImages] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imgKey, setImgKey] = useState(0);
    /** 全量图片：用于区域计数与总数统计 */
    const [allImages, setAllImages] = useState([]);
    const [allLoading, setAllLoading] = useState(true);
    /* ------------------------------- 交互状态 ------------------------------- */
    const [selected, setSelected] = useState([]);
    const [batching, setBatching] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveTarget, setMoveTarget] = useState('');
    const [confirmBatchDel, setConfirmBatchDel] = useState(false);
    const [confirmAreaDel, setConfirmAreaDel] = useState(null);
    const [confirmImgDel, setConfirmImgDel] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [areaForm, setAreaForm] = useState({ open: false, editing: null, name: '', parentId: '', description: '', sortOrder: '0' });
    const [areaSaving, setAreaSaving] = useState(false);
    const [editImg, setEditImg] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        areaId: '',
        sortOrder: '0',
    });
    const [savingImg, setSavingImg] = useState(false);
    const [lightbox, setLightbox] = useState({ open: false, index: 0 });
    const [dragId, setDragId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    /* ---------------------------------------------------------------------- */
    /*  数据加载                                                               */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        let alive = true;
        setAreasLoading(true);
        AdminApi.resource('gallery/areas')
            .list(AREA_LIST_PARAMS)
            .then((res) => {
            if (!alive)
                return;
            setAreas((res.data?.items ?? []));
            setAreasError(null);
        })
            .catch((e) => {
            if (!alive)
                return;
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
            if (!alive)
                return;
            setImages((res.data?.items ?? []));
            setTotal(Number(res.data?.total ?? 0));
            setError(null);
        })
            .catch((e) => {
            if (!alive)
                return;
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
                let items = (first.data?.items ?? []);
                const pages = Math.min(30, Math.ceil(all / 100));
                for (let p = 2; p <= pages; p++) {
                    const next = await AdminApi.galleryImages({ page: p, pageSize: 100, areaId: 'all' });
                    items = items.concat((next.data?.items ?? []));
                }
                if (alive)
                    setAllImages(items);
            }
            catch {
                /* 统计失败不阻塞主流程 */
            }
            finally {
                if (alive)
                    setAllLoading(false);
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
        const m = new Map();
        for (const img of allImages)
            m.set(img.areaId, (m.get(img.areaId) ?? 0) + 1);
        return m;
    }, [allImages]);
    const flatAreas = useMemo(() => {
        const ids = new Set(areas.map((a) => a.id));
        const byParent = new Map();
        for (const a of areas) {
            const key = a.parentId !== null && ids.has(a.parentId) ? a.parentId : null;
            if (!byParent.has(key))
                byParent.set(key, []);
            byParent.get(key).push(a);
        }
        for (const list of byParent.values())
            list.sort((x, y) => x.sortOrder - y.sortOrder || x.id - y.id);
        const flat = [];
        const walk = (parentId, depth) => (byParent.get(parentId) ?? []).map((a) => {
            const own = ownCounts.get(a.id) ?? 0;
            const children = walk(a.id, depth + 1);
            const node = {
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
    const currentArea = useMemo(() => (areaId === 'all' ? null : flatAreas.flat.find((a) => a.id === areaId) ?? null), [flatAreas, areaId]);
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
    const openAreaCreate = (parent) => {
        setAreaForm({
            open: true,
            editing: null,
            name: '',
            parentId: parent ? String(parent.id) : '',
            description: '',
            sortOrder: '0',
        });
    };
    const openAreaEdit = (node) => {
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
            const payload = {
                name,
                parentId: areaForm.parentId ? Number(areaForm.parentId) : null,
                description: areaForm.description.trim() || null,
                sortOrder: Number(areaForm.sortOrder) || 0,
            };
            if (areaForm.editing)
                await api.update(areaForm.editing.id, payload);
            else
                await api.create(payload);
            toast.success(areaForm.editing ? '区域已更新' : '区域已创建', name);
            setAreaForm((f) => ({ ...f, open: false }));
            refreshAreas();
            refreshImages();
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setAreaSaving(false);
        }
    };
    const removeArea = async () => {
        if (!confirmAreaDel)
            return;
        setDeleting(true);
        try {
            await AdminApi.resource('gallery/areas').remove(confirmAreaDel.id);
            toast.success('区域已删除', confirmAreaDel.name);
            if (areaId === confirmAreaDel.id)
                setAreaId('all');
            setConfirmAreaDel(null);
            refreshAreas();
            refreshImages();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setDeleting(false);
        }
    };
    /* ---------------------------------------------------------------------- */
    /*  图片操作                                                               */
    /* ---------------------------------------------------------------------- */
    const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const selectAllOnPage = () => {
        const ids = images.map((i) => i.id);
        setSelected((s) => ids.every((id) => s.includes(id)) ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]);
    };
    const uploads = async (urls) => {
        if (!urls.length)
            return;
        if (areaId === 'all') {
            toast.error('请先选择目标区域', '上传前需要在左侧选择一个具体的画廊区域');
            return;
        }
        try {
            const res = await AdminApi.addGalleryImages({ areaId, urls });
            toast.success(`已添加到「${currentArea?.name ?? '当前区域'}」`, `共 ${res?.count ?? urls.length} 张图片`);
            refreshImages();
            refreshAreas();
        }
        catch (e) {
            toast.error('添加图片失败', e.message);
        }
    };
    const submitOrder = async (ordered) => {
        if (ordered.length < 2)
            return;
        try {
            await AdminApi.batchGallery({
                ids: ordered.map((i) => i.id),
                action: 'order',
                order: ordered.map((i) => i.id),
            });
            toast.success('排序已保存', `${ordered.length} 张图片`);
            refreshImages();
        }
        catch (e) {
            toast.error('排序保存失败', e.message);
        }
    };
    const moveBy = async (index, dir) => {
        const next = index + dir;
        if (next < 0 || next >= images.length)
            return;
        const list = images.slice();
        const [item] = list.splice(index, 1);
        list.splice(next, 0, item);
        setImages(list);
        await submitOrder(list);
    };
    const onDrop = async (targetId) => {
        setDragOverId(null);
        const sourceId = dragId;
        setDragId(null);
        if (!sourceId || sourceId === targetId)
            return;
        const list = images.slice();
        const from = list.findIndex((i) => i.id === sourceId);
        const to = list.findIndex((i) => i.id === targetId);
        if (from < 0 || to < 0)
            return;
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
    const moveSelectedToArea = async (targetAreaId, closeModal = false) => {
        if (!selected.length)
            return;
        setBatching(true);
        try {
            await AdminApi.batchGallery({ ids: selected, action: 'move', areaId: targetAreaId });
            const name = flatAreas.flat.find((a) => a.id === targetAreaId)?.name ?? '目标区域';
            toast.success('已移动图片', `${selected.length} 张 → ${name}`);
            setSelected([]);
            if (closeModal)
                setMoveOpen(false);
            refreshAreas();
            refreshImages();
        }
        catch (e) {
            toast.error('移动失败', e.message);
        }
        finally {
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
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setBatching(false);
        }
    };
    const openImageEdit = (img) => {
        setEditImg(img);
        setEditForm({
            title: img.title ?? '',
            description: img.description ?? '',
            areaId: String(img.areaId),
            sortOrder: String(img.sortOrder ?? 0),
        });
    };
    const saveImage = async () => {
        if (!editImg)
            return;
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
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setSavingImg(false);
        }
    };
    const removeImage = async () => {
        if (!confirmImgDel)
            return;
        setDeleting(true);
        try {
            await AdminApi.deleteGalleryImage(confirmImgDel.id);
            toast.success('图片已删除');
            setConfirmImgDel(null);
            refreshImages();
            refreshAreas();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setDeleting(false);
        }
    };
    /* ---------------------------------------------------------------------- */
    /*  灯箱键盘控制                                                           */
    /* ---------------------------------------------------------------------- */
    const closeLightbox = useCallback(() => setLightbox({ open: false, index: 0 }), []);
    useEscape(closeLightbox, lightbox.open);
    useEffect(() => {
        if (!lightbox.open)
            return;
        const onKey = (e) => {
            if (e.key === 'ArrowLeft')
                setLightbox((s) => ({ ...s, index: s.index > 0 ? s.index - 1 : images.length - 1 }));
            else if (e.key === 'ArrowRight')
                setLightbox((s) => ({ ...s, index: s.index < images.length - 1 ? s.index + 1 : 0 }));
            else if (e.key === 'Escape')
                closeLightbox();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightbox.open, images.length, closeLightbox]);
    /* ---------------------------------------------------------------------- */
    /*  渲染                                                                   */
    /* ---------------------------------------------------------------------- */
    const TreeRow = ({ node }) => {
        const active = areaId === node.id;
        return (_jsxs("div", { className: "group relative", style: { paddingLeft: `${node.depth * 14}px` }, onDragOver: (e) => {
                if (dragId)
                    e.preventDefault();
            }, onDrop: (e) => {
                if (!dragId)
                    return;
                e.preventDefault();
                void moveSelectedToArea(node.id);
            }, children: [_jsxs("button", { onClick: () => {
                        setAreaId(node.id);
                        setPage(1);
                        setSelected([]);
                    }, className: cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-all duration-200', active
                        ? 'border-primary/45 bg-primary/[0.12] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                        : 'border-transparent text-foreground/80 hover:border-white/10 hover:bg-white/[0.055]'), children: [node.children.length ? (_jsx(ChevronDown, { className: cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground') })) : (_jsx("span", { className: cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-white/25') })), _jsx("span", { className: "clamp-1 min-w-0 flex-1 font-medium", children: node.name }), _jsx("span", { className: cn('mono shrink-0 rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary/18 text-primary' : 'bg-white/8 text-muted-foreground'), children: node.totalCount })] }), _jsxs("div", { className: "absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-black/65 p-0.5 backdrop-blur group-hover:flex", children: [_jsx(IconMini, { icon: Plus, label: "\u65B0\u589E\u5B50\u533A\u57DF", onClick: () => openAreaCreate(node) }), _jsx(IconMini, { icon: Pencil, label: "\u7F16\u8F91\u533A\u57DF", onClick: () => openAreaEdit(node) }), _jsx(IconMini, { icon: Trash2, label: "\u5220\u9664\u533A\u57DF", tone: "danger", onClick: () => setConfirmAreaDel(node) })] })] }));
    };
    return (_jsxs(AdminPage, { title: "\u6D3B\u52A8\u753B\u5ECA", breadcrumb: "\u540E\u53F0\u7BA1\u7406 \u00B7 \u7AD9\u70B9\u5EFA\u8BBE", icon: _jsx(Images, { className: "h-5 w-5" }), description: "\u591A\u5C42\u7EA7\u533A\u57DF\u7BA1\u7406\u3001\u6279\u91CF\u4E0A\u4F20\u4E0E\u8DE8\u533A\u79FB\u52A8\u3001\u62D6\u52A8\u6392\u5E8F\u3001\u706F\u7BB1\u9884\u89C8\u4E0E\u56FE\u7247\u4FE1\u606F\u7F16\u8F91\u3002", actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "glass", onClick: () => {
                        refreshAreas();
                        refreshImages();
                    }, disabled: loading, children: [_jsx(RefreshCw, { className: cn('h-3.5 w-3.5', loading && 'animate-spin') }), "\u5237\u65B0"] }), _jsxs(Button, { variant: "primary", onClick: () => openAreaCreate(null), children: [_jsx(FolderPlus, { className: "h-4 w-4" }), "\u65B0\u5EFA\u533A\u57DF"] })] }), children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 lg:grid-cols-4", "data-reveal": true, children: [_jsx(StatTile, { label: "\u533A\u57DF\u603B\u6570", value: areasLoading ? '…' : fnum(areas.length), hint: "\u542B\u6240\u6709\u5C42\u7EA7\u5B50\u533A\u57DF", tone: "primary", icon: _jsx(FolderTree, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u56FE\u7247\u603B\u6570", value: allLoading ? '…' : fnum(totalCount), hint: "\u5168\u7AD9\u753B\u5ECA\u56FE\u7247", tone: "accent", icon: _jsx(ImageIcon, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u9876\u7EA7\u533A\u57DF", value: areasLoading ? '…' : fnum(flatAreas.tree.length), hint: `子区域 ${fnum(Math.max(0, areas.length - flatAreas.tree.length))} 个`, tone: "success", icon: _jsx(Layers, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u5F53\u524D\u89C6\u56FE", value: fnum(total), hint: currentArea ? `${currentArea.name} · 含子区域 ${fnum(currentArea.totalCount)} 张` : '全部图片（按排序号升序）', tone: "warning", icon: _jsx(Images, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs(Glass, { tone: "soft", className: "flex flex-col p-4 lg:sticky lg:top-[92px] lg:max-h-[calc(100dvh-130px)]", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsxs("p", { className: "flex items-center gap-2 text-[13px] font-medium", children: [_jsx(FolderTree, { className: "h-4 w-4 text-primary" }), "\u533A\u57DF\u6811"] }), _jsx("button", { onClick: () => openAreaCreate(null), className: "rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", title: "\u65B0\u5EFA\u9876\u7EA7\u533A\u57DF", "aria-label": "\u65B0\u5EFA\u9876\u7EA7\u533A\u57DF", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) })] }), _jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto pr-0.5", children: [_jsxs("button", { onClick: () => {
                                                    setAreaId('all');
                                                    setPage(1);
                                                    setSelected([]);
                                                }, className: cn('mb-1 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-all duration-200', areaId === 'all'
                                                    ? 'border-primary/45 bg-primary/[0.12] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
                                                    : 'border-transparent text-foreground/80 hover:border-white/10 hover:bg-white/[0.055]'), children: [_jsx(Images, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "flex-1 font-medium", children: "\u5168\u90E8\u56FE\u7247" }), _jsx("span", { className: cn('mono rounded-full px-1.5 py-0.5 text-[10px]', areaId === 'all' ? 'bg-primary/18 text-primary' : 'bg-white/8 text-muted-foreground'), children: allLoading ? '…' : totalCount })] }), areasLoading ? (_jsx("div", { className: "flex flex-col gap-2 pt-1", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-9" }, i))) })) : areasError ? (_jsx("p", { className: "px-2 py-6 text-[12px] leading-relaxed text-[hsl(var(--destructive))]", children: areasError })) : flatAreas.flat.length ? (_jsx("div", { className: "flex flex-col gap-0.5", children: flatAreas.flat.map((node) => (_jsx(TreeRow, { node: node }, node.id))) })) : (_jsxs("div", { className: "px-2 py-8 text-center", children: [_jsx(ImageIcon, { className: "mx-auto mb-3 h-7 w-7 text-muted-foreground/70" }), _jsx("p", { className: "text-[12px] text-muted-foreground", children: "\u8FD8\u6CA1\u6709\u753B\u5ECA\u533A\u57DF" }), _jsxs(Button, { variant: "glass", size: "sm", className: "mt-4", onClick: () => openAreaCreate(null), children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), "\u65B0\u5EFA\u7B2C\u4E00\u4E2A\u533A\u57DF"] })] }))] }), _jsxs("div", { className: "mt-3 flex items-start gap-2 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" }), _jsx("span", { children: "hover \u6BCF\u884C\u53F3\u4FA7\u53EF\u7F16\u8F91 / \u65B0\u589E\u5B50\u533A\u57DF / \u5220\u9664\uFF1B\u628A\u56FE\u7247\u5361\u7247\u62D6\u5230\u533A\u57DF\u884C\u4E0A\u53EF\u76F4\u63A5\u8DE8\u533A\u79FB\u52A8\u3002\u5220\u9664\u533A\u57DF\u4F1A\u7EA7\u8054\u5220\u9664\u5176\u4E0B\u56FE\u7247\u3002" })] })] }), !!unassignedCount && (_jsxs(Glass, { tone: "soft", className: "flex items-start gap-2.5 p-4 text-[12px] text-muted-foreground", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" }), _jsxs("span", { children: ["\u6709 ", _jsx("span", { className: "mono text-foreground", children: unassignedCount }), " \u5F20\u56FE\u7247\u7684\u6240\u5C5E\u533A\u57DF\u5DF2\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5728\u300C\u5168\u90E8\u56FE\u7247\u300D\u4E2D\u91CD\u65B0\u5F52\u7C7B\u3002"] })] }))] }), _jsxs("div", { className: "flex min-w-0 flex-col gap-4", children: [_jsxs(Glass, { tone: "soft", className: "flex flex-wrap items-center gap-3 p-3", children: [_jsxs("div", { className: "relative min-w-[190px] flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: search, onChange: (e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }, placeholder: "\u641C\u7D22\u56FE\u7247\u6807\u9898 / \u63CF\u8FF0\u2026", className: "pl-10" })] }), _jsxs("span", { className: "mono hidden text-[11px] text-muted-foreground sm:inline", children: [currentArea ? currentArea.name : '全部图片', " \u00B7 ", fnum(total), " \u5F20"] }), _jsxs(Button, { variant: "glass", size: "sm", onClick: selectAllOnPage, disabled: !images.length, children: [_jsx(Check, { className: "h-3.5 w-3.5" }), images.length && images.every((i) => selected.includes(i.id)) ? '取消全选' : '全选本页'] })] }), selected.length > 0 && (_jsxs(Glass, { tone: "strong", className: "flex flex-wrap items-center gap-2.5 p-3", children: [_jsxs(Chip, { tone: "primary", className: "!px-3 !py-1", children: ["\u5DF2\u9009 ", selected.length, " \u5F20"] }), _jsxs(Button, { size: "sm", variant: "glass", onClick: () => setMoveOpen(true), disabled: batching, children: [_jsx(Move, { className: "h-3.5 w-3.5" }), "\u79FB\u52A8\u5230\u533A\u57DF"] }), _jsxs(Button, { size: "sm", variant: "glass", onClick: () => setConfirmBatchDel(true), disabled: batching, children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "\u6279\u91CF\u5220\u9664"] }), _jsxs(Button, { size: "sm", variant: "ghost", className: "ml-auto", onClick: () => setSelected([]), disabled: batching, children: [_jsx(X, { className: "h-3.5 w-3.5" }), "\u53D6\u6D88\u9009\u62E9"] })] })), _jsxs(Glass, { tone: "soft", className: "p-4", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [_jsxs("p", { className: "flex items-center gap-2 text-[13px] font-medium", children: [_jsx(Upload, { className: "h-4 w-4 text-primary" }), "\u6279\u91CF\u4E0A\u4F20", currentArea && _jsxs("span", { className: "text-muted-foreground", children: ["\u2192 ", currentArea.name] })] }), orderEnabled && (_jsxs("span", { className: "mono flex items-center gap-1.5 text-[11px] text-muted-foreground", children: [_jsx(GripVertical, { className: "h-3.5 w-3.5" }), "\u62D6\u52A8\u5361\u7247\u6216\u4F7F\u7528 \u2191\u2193 \u6392\u5E8F"] }))] }), areaId === 'all' ? (_jsxs("div", { className: "flex items-start gap-2.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-[12px] text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" }), _jsx("span", { children: "\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u62E9\u4E00\u4E2A\u5177\u4F53\u7684\u533A\u57DF\uFF0C\u4E0A\u4F20\u7684\u56FE\u7247\u4F1A\u52A0\u5165\u8BE5\u533A\u57DF\uFF1B\u4E5F\u53EF\u4EE5\u5148\u300C\u65B0\u5EFA\u533A\u57DF\u300D\u3002" })] })) : (_jsx(MultiImageUpload, { onUploaded: (urls) => void uploads(urls) }))] }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: refreshImages }) })) : loading ? (_jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", children: Array.from({ length: 8 }).map((_, i) => (_jsx(Skeleton, { className: "aspect-[4/3]" }, i))) })) : images.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", children: images.map((img, idx) => {
                                            const isSel = selected.includes(img.id);
                                            return (_jsxs("div", { draggable: orderEnabled, onDragStart: () => orderEnabled && setDragId(img.id), onDragEnd: () => {
                                                    setDragId(null);
                                                    setDragOverId(null);
                                                }, onDragOver: (e) => {
                                                    if (!orderEnabled || dragId === null)
                                                        return;
                                                    e.preventDefault();
                                                    if (dragOverId !== img.id)
                                                        setDragOverId(img.id);
                                                }, onDrop: (e) => {
                                                    if (!orderEnabled)
                                                        return;
                                                    e.preventDefault();
                                                    void onDrop(img.id);
                                                }, className: cn('group relative overflow-hidden rounded-2xl border transition-all duration-300', isSel ? 'border-primary/55 shadow-[0_0_0_1px_hsl(var(--primary)/.35)]' : 'border-white/8 hover:border-white/20', dragOverId === img.id && dragId !== img.id && 'ring-2 ring-primary/60', dragId === img.id && 'opacity-45'), children: [_jsxs("div", { className: "relative aspect-[4/3] w-full overflow-hidden bg-white/[0.04]", children: [_jsx("img", { src: img.url, alt: img.title || '画廊图片', loading: "lazy", className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" }), _jsxs("div", { className: "absolute inset-0 flex flex-col justify-between bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 p-2.5", children: [_jsx("button", { onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleSelect(img.id);
                                                                                }, "aria-label": isSel ? '取消选择' : '选择', className: cn('flex h-6 w-6 items-center justify-center rounded-lg border transition', isSel ? 'border-primary bg-primary' : 'border-white/35 bg-black/35 hover:border-white/60'), children: isSel && _jsx(Check, { className: "h-3.5 w-3.5 text-[hsl(var(--primary-foreground))]", strokeWidth: 3.2 }) }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(IconMini, { icon: ArrowUp, label: "\u4E0A\u79FB", overlay: true, disabled: idx === 0 || !orderEnabled, onClick: () => void moveBy(idx, -1) }), _jsx(IconMini, { icon: ArrowDown, label: "\u4E0B\u79FB", overlay: true, disabled: idx === images.length - 1 || !orderEnabled, onClick: () => void moveBy(idx, 1) })] })] }), _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("button", { onClick: () => setLightbox({ open: true, index: idx }), className: "lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:scale-105", title: "\u653E\u5927\u9884\u89C8", "aria-label": "\u653E\u5927\u9884\u89C8", children: _jsx(Maximize2, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => openImageEdit(img), className: "lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:scale-105", title: "\u7F16\u8F91\u4FE1\u606F", "aria-label": "\u7F16\u8F91\u4FE1\u606F", children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => setConfirmImgDel(img), className: "lg-thin backdrop-blur-md flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--destructive))] transition hover:scale-105", title: "\u5220\u9664\u56FE\u7247", "aria-label": "\u5220\u9664\u56FE\u7247", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "p-2.5 text-[10px] text-white/95", children: [_jsx("p", { className: "clamp-1", children: img.title || '未命名图片' }), _jsxs("p", { className: "mono mt-0.5 text-white/70", children: [img.areaName ?? '未知区域', " \u00B7 ", img.width, "\u00D7", img.height] })] })] }), isSel && (_jsx("span", { className: "pointer-events-none absolute left-2.5 top-2.5 h-6 w-6 rounded-lg border border-primary bg-primary/90 shadow-[0_0_14px_-2px_hsl(var(--primary)/.7)]" }))] }), _jsxs("div", { className: "flex items-center gap-2 px-3 py-2.5", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "clamp-1 text-[12px] text-foreground/90", children: img.title || '未命名图片' }), _jsxs("p", { className: "mono clamp-1 text-[10px] text-muted-foreground", children: ["#", img.id, " \u00B7 ", img.areaName ?? '—'] })] }), orderEnabled && _jsx(GripVertical, { className: "h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/70" })] })] }, img.id));
                                        }) }), _jsxs("div", { className: "flex flex-col items-center justify-between gap-3 sm:flex-row", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u5171 ", _jsx("span", { className: "mono text-foreground", children: total }), " \u5F20 \u00B7 \u7B2C ", page, " / ", Math.max(1, Math.ceil(total / PAGE_SIZE)), " \u9875", selected.length ? ` · 已选 ${selected.length} 张` : ''] }), _jsxs("div", { className: "flex items-center gap-3", children: [orderEnabled && (_jsxs(Button, { variant: "glass", size: "sm", onClick: () => void submitOrder(images), title: "\u628A\u5F53\u524D\u9875\u987A\u5E8F\u5199\u56DE\u6392\u5E8F\u53F7", children: [_jsx(Save, { className: "h-3.5 w-3.5" }), "\u4FDD\u5B58\u5F53\u524D\u987A\u5E8F"] })), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: setPage })] })] })] })) : (_jsx(Glass, { tone: "soft", children: _jsxs("div", { className: "flex flex-col items-center justify-center px-6 py-16 text-center", children: [_jsx(ImageIcon, { className: "mb-4 h-8 w-8 text-muted-foreground/70" }), _jsx("h3", { className: "text-base font-medium", children: q ? '没有匹配的图片' : '该区域还没有图片' }), _jsx("p", { className: "mt-2 max-w-sm text-sm text-muted-foreground", children: q ? '换个关键词搜索，或清空搜索框查看全部图片。' : '在上方上传区拖入图片即可批量添加到当前区域。' }), q && (_jsx(Button, { variant: "glass", size: "sm", className: "mt-5", onClick: () => setSearch(''), children: "\u6E05\u7A7A\u641C\u7D22" }))] }) }))] })] }), _jsx(Modal, { open: areaForm.open, onClose: () => setAreaForm((f) => ({ ...f, open: false })), title: areaForm.editing ? '编辑区域' : '新建区域', description: "\u533A\u57DF\u652F\u6301\u591A\u5C42\u7EA7\u5D4C\u5957\uFF0C\u95E8\u6237\u753B\u5ECA\u4F1A\u6309\u5C42\u7EA7\u5C55\u793A\u7B5B\u9009\u9879\u3002", size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setAreaForm((f) => ({ ...f, open: false })), disabled: areaSaving, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: () => void saveArea(), loading: areaSaving, children: "\u4FDD\u5B58" })] }), children: _jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(Field, { label: "\u533A\u57DF\u540D\u79F0", required: true, hint: "\u4F8B\u5982\u300C\u7B2C\u56DB\u5C4A\u6821\u56ED\u79D1\u6280\u6587\u5316\u8282\u300D\u3002", children: _jsx(Input, { value: areaForm.name, onChange: (e) => setAreaForm((f) => ({ ...f, name: e.target.value })), placeholder: "\u8BF7\u8F93\u5165\u533A\u57DF\u540D\u79F0" }) }), _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u4E0A\u7EA7\u533A\u57DF", hint: "\u7559\u7A7A\u8868\u793A\u9876\u7EA7\u533A\u57DF\u3002", children: _jsxs(Select, { value: areaForm.parentId, onChange: (e) => setAreaForm((f) => ({ ...f, parentId: e.target.value })), children: [_jsx("option", { value: "", children: "\u9876\u7EA7\u533A\u57DF" }), flatAreas.flat
                                                .filter((a) => !areaForm.editing || (a.id !== areaForm.editing.id && !isDescendant(flatAreas.flat, a.id, areaForm.editing.id)))
                                                .map((a) => (_jsxs("option", { value: String(a.id), children: ['　'.repeat(a.depth), a.name] }, a.id)))] }) }), _jsx(Field, { label: "\u6392\u5E8F", hint: "\u6570\u5B57\u8D8A\u5C0F\u8D8A\u9760\u524D\u3002", children: _jsx(Input, { type: "number", value: areaForm.sortOrder, onChange: (e) => setAreaForm((f) => ({ ...f, sortOrder: e.target.value })) }) })] }), _jsx(Field, { label: "\u533A\u57DF\u63CF\u8FF0", hint: "\u5C55\u793A\u5728\u95E8\u6237\u753B\u5ECA\u7684\u533A\u57DF\u8BF4\u660E\uFF0C\u53EF\u7559\u7A7A\u3002", children: _jsx(Textarea, { rows: 3, value: areaForm.description, onChange: (e) => setAreaForm((f) => ({ ...f, description: e.target.value })), placeholder: "\u7B80\u8981\u63CF\u8FF0\u8BE5\u533A\u57DF\u6536\u5F55\u7684\u5185\u5BB9" }) }), areaForm.editing && (_jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-[12px] leading-relaxed text-muted-foreground", children: [_jsxs("p", { children: ["\u8BE5\u533A\u57DF\u4E0B\u6709 ", _jsx("span", { className: "mono text-foreground", children: areaForm.editing.totalCount }), " \u5F20\u56FE\u7247\uFF08\u5B50\u533A\u57DF", ' ', _jsx("span", { className: "mono text-foreground", children: areaForm.editing.children.length }), " \u4E2A \u00B7 \u672C\u5C42", ' ', _jsx("span", { className: "mono text-foreground", children: areaForm.editing.ownCount }), " \u5F20\uFF09\u3002"] }), _jsxs("p", { className: "mono mt-1 text-[11px] opacity-80", children: ["slug \u00B7 ", areaForm.editing.slug] })] }))] }) }), _jsxs(Modal, { open: moveOpen, onClose: () => setMoveOpen(false), title: "\u79FB\u52A8\u5230\u533A\u57DF", description: `将选中的 ${selected.length} 张图片移动到目标区域。`, size: "sm", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setMoveOpen(false), disabled: batching, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: () => void batchMove(), loading: batching, disabled: !moveTarget, children: "\u786E\u8BA4\u79FB\u52A8" })] }), children: [_jsx(Field, { label: "\u76EE\u6807\u533A\u57DF", required: true, children: _jsxs(Select, { value: moveTarget, onChange: (e) => setMoveTarget(e.target.value), children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u76EE\u6807\u533A\u57DF\u2026" }), flatAreas.flat.map((a) => (_jsxs("option", { value: String(a.id), children: ['　'.repeat(a.depth), a.name] }, a.id)))] }) }), _jsx("p", { className: "mt-3 text-[12px] leading-relaxed text-muted-foreground", children: "\u79FB\u52A8\u540E\u56FE\u7247\u4F1A\u8FFD\u52A0\u5230\u76EE\u6807\u533A\u57DF\u672B\u5C3E\u3002\u4E5F\u53EF\u4EE5\u76F4\u63A5\u628A\u56FE\u7247\u5361\u7247\u62D6\u5230\u5DE6\u4FA7\u533A\u57DF\u884C\u4E0A\u5B8C\u6210\u8DE8\u533A\u79FB\u52A8\u3002" })] }), _jsx(Drawer, { open: !!editImg, onClose: () => setEditImg(null), title: "\u7F16\u8F91\u56FE\u7247\u4FE1\u606F", width: "max-w-xl", footer: _jsxs("div", { className: "flex items-center justify-end gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setEditImg(null), disabled: savingImg, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: () => void saveImage(), loading: savingImg, children: "\u4FDD\u5B58\u4FEE\u6539" })] }), children: editImg ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx("div", { className: "overflow-hidden rounded-2xl border border-white/8", children: _jsx("img", { src: editImg.url, alt: editImg.title || '画廊图片', className: "aspect-[4/3] w-full object-cover" }) }), _jsx(Field, { label: "\u6807\u9898", children: _jsx(Input, { value: editForm.title, onChange: (e) => setEditForm((f) => ({ ...f, title: e.target.value })), placeholder: "\u56FE\u7247\u6807\u9898" }) }), _jsx(Field, { label: "\u63CF\u8FF0", children: _jsx(Textarea, { rows: 3, value: editForm.description, onChange: (e) => setEditForm((f) => ({ ...f, description: e.target.value })), placeholder: "\u56FE\u7247\u8BF4\u660E\uFF0C\u53EF\u7559\u7A7A" }) }), _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u6240\u5C5E\u533A\u57DF", required: true, children: _jsx(Select, { value: editForm.areaId, onChange: (e) => setEditForm((f) => ({ ...f, areaId: e.target.value })), children: flatAreas.flat.map((a) => (_jsxs("option", { value: String(a.id), children: ['　'.repeat(a.depth), a.name] }, a.id))) }) }), _jsx(Field, { label: "\u6392\u5E8F\u53F7", hint: "\u6570\u5B57\u8D8A\u5C0F\u8D8A\u9760\u524D\u3002", children: _jsx(Input, { type: "number", value: editForm.sortOrder, onChange: (e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value })) }) })] }), _jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-[11px] leading-relaxed text-muted-foreground", children: [_jsxs("p", { className: "mono break-all", children: ["URL \u00B7 ", editImg.url] }), _jsxs("p", { className: "mono mt-1", children: ["\u5C3A\u5BF8 \u00B7 ", editImg.width, "\u00D7", editImg.height, " \u00B7 \u4E0A\u4F20\u4E8E ", fdatetime(editImg.createdAt)] })] })] })) : (_jsx("div", { className: "flex flex-col gap-3", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-20" }, i))) })) }), lightbox.open && lightboxItem && (_jsxs("div", { className: "fixed inset-0 z-[95] flex flex-col", children: [_jsx("div", { className: "absolute inset-0 bg-black/88 backdrop-blur-md", onClick: closeLightbox, style: { animation: 'sti-fade .25s ease both' } }), _jsxs("div", { className: "relative z-10 flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5", style: { animation: 'sti-fade .3s ease both' }, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 text-[13px] font-medium", children: lightboxItem.title || '未命名图片' }), _jsxs("p", { className: "mono text-[11px] text-muted-foreground", children: [lightboxItem.areaName ?? '未知区域', " \u00B7 ", lightbox.index + 1, " / ", images.length, " \u00B7 ", lightboxItem.width, "\u00D7", lightboxItem.height] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsxs(Button, { size: "sm", variant: "glass", onClick: () => openImageEdit(lightboxItem), children: [_jsx(Pencil, { className: "h-3.5 w-3.5" }), "\u7F16\u8F91\u4FE1\u606F"] }), _jsx("button", { onClick: closeLightbox, className: "rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", "aria-label": "\u5173\u95ED\u9884\u89C8", children: _jsx(X, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "relative z-10 flex min-h-0 flex-1 items-center justify-center gap-3 p-4 sm:gap-5 sm:p-6", children: [_jsx("button", { onClick: () => setLightbox((s) => ({ ...s, index: s.index > 0 ? s.index - 1 : images.length - 1 })), className: "lg-thin backdrop-blur-md flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:scale-105", "aria-label": "\u4E0A\u4E00\u5F20", title: "\u4E0A\u4E00\u5F20\uFF08\u2190\uFF09", children: _jsx(ArrowLeft, { className: "h-5 w-5" }) }), _jsx("div", { className: "flex min-h-0 min-w-0 flex-1 items-center justify-center", children: _jsx("img", { src: lightboxItem.url, alt: lightboxItem.title || '画廊图片', className: "max-h-full max-w-full rounded-2xl border border-white/10 object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' } }, lightboxItem.id) }), _jsx("button", { onClick: () => setLightbox((s) => ({ ...s, index: s.index < images.length - 1 ? s.index + 1 : 0 })), className: "lg-thin backdrop-blur-md flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:scale-105", "aria-label": "\u4E0B\u4E00\u5F20", title: "\u4E0B\u4E00\u5F20\uFF08\u2192\uFF09", children: _jsx(ArrowLeft, { className: "h-5 w-5 rotate-180" }) })] }), lightboxItem.description && (_jsx("div", { className: "relative z-10 border-t border-white/8 px-5 py-3", children: _jsx("p", { className: "mx-auto max-w-3xl text-center text-[12px] leading-relaxed text-muted-foreground", children: lightboxItem.description }) })), _jsx("p", { className: "relative z-10 pb-4 text-center text-[11px] text-muted-foreground/70", children: "\u2190 \u2192 \u5207\u6362\u56FE\u7247 \u00B7 Esc \u9000\u51FA\u9884\u89C8" })] })), _jsx(ConfirmDialog, { open: confirmBatchDel, onClose: () => setConfirmBatchDel(false), onConfirm: () => void batchDelete(), loading: batching, title: "\u6279\u91CF\u5220\u9664\u56FE\u7247", confirmText: `删除 ${selected.length} 张`, description: "\u5220\u9664\u540E\u8FD9\u4E9B\u56FE\u7247\u8BB0\u5F55\u4F1A\u4ECE\u6570\u636E\u5E93\u4E2D\u79FB\u9664\uFF0C\u4E14\u4E0D\u53EF\u6062\u590D\u3002" }), _jsx(ConfirmDialog, { open: !!confirmImgDel, onClose: () => setConfirmImgDel(null), onConfirm: () => void removeImage(), loading: deleting, title: "\u5220\u9664\u56FE\u7247", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u8BE5\u56FE\u7247\u5C06\u4ECE\u753B\u5ECA\u4E2D\u79FB\u9664\u3002", confirmImgDel && _jsx("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: confirmImgDel.title || confirmImgDel.url })] }) }), _jsx(ConfirmDialog, { open: !!confirmAreaDel, onClose: () => setConfirmAreaDel(null), onConfirm: () => void removeArea(), loading: deleting, title: "\u5220\u9664\u753B\u5ECA\u533A\u57DF", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u5220\u9664\u533A\u57DF\u4F1A\u540C\u65F6\u5220\u9664\u5176\u4E0B\u6240\u6709\u5B50\u533A\u57DF\u4E0E\u56FE\u7247\uFF08\u7EA7\u8054\u5220\u9664\uFF0C\u4E0D\u53EF\u6062\u590D\uFF09\u3002", confirmAreaDel && (_jsxs("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: [confirmAreaDel.name, " \u00B7 \u56FE\u7247 ", confirmAreaDel.totalCount, " \u5F20 \u00B7 \u5B50\u533A\u57DF ", confirmAreaDel.children.length, " \u4E2A"] }))] }) })] }));
}
/* ---------------------------------------------------------------------------
 * 小部件
 * ------------------------------------------------------------------------ */
function IconMini({ icon: Icon, label, onClick, tone = 'default', disabled, overlay, }) {
    return (_jsx("button", { type: "button", title: label, "aria-label": label, disabled: disabled, onClick: (e) => {
            e.stopPropagation();
            onClick();
        }, className: cn('flex h-7 w-7 items-center justify-center rounded-lg transition', overlay
            ? 'border border-white/12 bg-black/40 text-white/90 hover:border-white/30'
            : 'text-muted-foreground hover:bg-white/10 hover:text-foreground', tone === 'danger' && 'hover:bg-[hsl(var(--destructive))]/15 hover:text-[hsl(var(--destructive))]', disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent'), children: _jsx(Icon, { className: "h-3.5 w-3.5" }) }));
}
/** 判断 candidateId 是否为 ancestorId 的后代（防止把区域挂到自己的子树下） */
function isDescendant(flat, candidateId, ancestorId) {
    let cur = flat.find((a) => a.id === candidateId);
    let guard = 0;
    while (cur && guard++ < 64) {
        if (cur.parentId === null)
            return false;
        if (cur.parentId === ancestorId)
            return true;
        cur = flat.find((a) => a.id === cur.parentId);
    }
    return false;
}
