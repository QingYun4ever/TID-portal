import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Check, Code2, FileUp, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered, Loader2, Pencil, Plus, Quote, RefreshCw, Trash2, Upload, X, } from 'lucide-react';
import { AdminApi, getToken } from '@/lib/api';
import { cn, plain } from '@/lib/utils';
import { useToast } from '@/lib/store';
import { Button, Chip, ConfirmDialog, Drawer, EmptyState, Field, Glass, Input, Modal, Pagination, SearchInput, Select, Skeleton, Switch, Td, Textarea, Th, TableWrap, } from './ui';
/* =============================================================================
 * 后台页面骨架
 * ========================================================================== */
export function AdminPage({ title, description, actions, children, breadcrumb, icon, }) {
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [breadcrumb && _jsx("p", { className: "mb-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground", children: breadcrumb }), _jsxs("h1", { className: "flex items-center gap-3 text-2xl font-semibold tracking-tight", children: [icon && _jsx("span", { className: "text-primary", children: icon }), title] }), description && _jsx("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: description })] }), actions && _jsx("div", { className: "flex shrink-0 flex-wrap items-center gap-2.5", children: actions })] }), children] }));
}
/* =============================================================================
 * 统计卡片
 * ========================================================================== */
export function StatTile({ label, value, hint, tone = 'primary', icon, onClick, active, }) {
    const tones = {
        primary: 'text-primary',
        accent: 'text-accent',
        success: 'text-[hsl(var(--success))]',
        warning: 'text-[hsl(var(--warning))]',
        danger: 'text-[hsl(var(--destructive))]',
    };
    const Comp = onClick ? 'button' : 'div';
    return (_jsxs(Comp, { onClick: onClick, className: cn('lg-soft lg-refract relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300', onClick && 'hover:-translate-y-0.5 hover:border-white/20', active ? 'border-primary/45 bg-primary/[0.07]' : 'border-white/8'), children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { className: "text-[11px] tracking-wide text-muted-foreground", children: label }), icon && _jsx("span", { className: cn('opacity-75', tones[tone]), children: icon })] }), _jsx("div", { className: cn('mono mt-2.5 text-xl font-semibold tabular-nums', tones[tone]), children: value }), hint && _jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: hint })] }));
}
export function FilterBar({ search, onSearch, placeholder = '搜索…', filters = [], extra, className, }) {
    return (_jsxs(Glass, { tone: "soft", className: cn('flex flex-wrap items-center gap-3 p-3', className), children: [onSearch && (_jsx(SearchInput, { value: search ?? '', onChange: onSearch, placeholder: placeholder, className: "min-w-[200px] flex-1" })), filters.map((f) => (_jsx(Select, { value: f.value, onChange: (e) => f.onChange(e.target.value), className: "w-auto min-w-[140px]", children: f.options.map((o) => (_jsxs("option", { value: o.value, children: [o.label, o.count !== undefined ? `（${o.count}）` : ''] }, o.value))) }, f.name))), extra] }));
}
export function DataTable({ columns, rows, loading, empty, emptyDescription, selectable, selected, onSelectedChange, onRowClick, rowActions, page, pageSize, total, onPageChange, dense, }) {
    const sel = selected ?? [];
    const allChecked = rows.length > 0 && rows.every((r) => sel.includes(r.id));
    if (loading)
        return (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx("div", { className: "flex flex-col gap-2", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-12" }, i))) }) }));
    if (!rows.length)
        return (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { title: empty ?? '暂无数据', description: emptyDescription }) }));
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(TableWrap, { children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { children: [selectable && (_jsx(Th, { className: "w-10", children: _jsx("button", { onClick: () => onSelectedChange?.(allChecked ? [] : rows.map((r) => r.id)), className: cn('flex h-4 w-4 items-center justify-center rounded-[5px] border transition', allChecked ? 'border-primary bg-primary' : 'border-white/25 hover:border-white/45'), "aria-label": "\u5168\u9009", children: allChecked && _jsx(Check, { className: "h-3 w-3 text-[hsl(var(--primary-foreground))]", strokeWidth: 3.5 }) }) })), columns.map((c) => (_jsx(Th, { style: { width: c.width }, className: c.className, children: c.title }, c.key))), rowActions && _jsx(Th, { className: "w-28 text-right", children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsxs("tr", { onClick: onRowClick ? () => onRowClick(row) : undefined, className: cn('transition-colors duration-200', onRowClick && 'cursor-pointer', sel.includes(row.id) ? 'bg-primary/[0.055]' : 'hover:bg-white/[0.03]'), children: [selectable && (_jsx(Td, { className: "w-10", children: _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                onSelectedChange?.(sel.includes(row.id) ? sel.filter((x) => x !== row.id) : [...sel, row.id]);
                                            }, className: cn('flex h-4 w-4 items-center justify-center rounded-[5px] border transition', sel.includes(row.id) ? 'border-primary bg-primary' : 'border-white/25 hover:border-white/45'), "aria-label": "\u9009\u62E9", children: sel.includes(row.id) && (_jsx(Check, { className: "h-3 w-3 text-[hsl(var(--primary-foreground))]", strokeWidth: 3.5 })) }) })), columns.map((c) => (_jsx(Td, { className: cn(dense && 'py-2', c.className), children: c.render(row, i) }, c.key))), rowActions && (_jsx(Td, { className: "text-right", onClick: undefined, children: _jsx("div", { className: "flex items-center justify-end gap-1", onClick: (e) => e.stopPropagation(), children: rowActions(row) }) }))] }, row.id))) })] }) }), page !== undefined && pageSize !== undefined && total !== undefined && onPageChange && (_jsxs("div", { className: "flex flex-col items-center justify-between gap-3 sm:flex-row", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u5171 ", _jsx("span", { className: "mono text-foreground", children: total }), " \u6761 \u00B7 \u7B2C ", page, " / ", Math.max(1, Math.ceil(total / pageSize)), " \u9875"] }), _jsx(Pagination, { page: page, pageSize: pageSize, total: total, onChange: onPageChange })] }))] }));
}
/* =============================================================================
 * 行内操作按钮
 * ========================================================================== */
export function RowBtn({ icon: Icon, label, onClick, tone = 'default', }) {
    const tones = {
        default: 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
        danger: 'text-muted-foreground hover:bg-[hsl(var(--destructive))]/15 hover:text-[hsl(var(--destructive))]',
        primary: 'text-muted-foreground hover:bg-primary/15 hover:text-primary',
        success: 'text-muted-foreground hover:bg-[hsl(var(--success))]/15 hover:text-[hsl(var(--success))]',
    };
    return (_jsx("button", { onClick: onClick, title: label, "aria-label": label, className: cn('rounded-lg p-2 transition', tones[tone]), children: _jsx(Icon, { className: "h-[15px] w-[15px]" }) }));
}
/* =============================================================================
 * 富文本编辑器（contentEditable）
 * ========================================================================== */
export function RichTextEditor({ value, onChange, placeholder = '在此撰写内容…', minHeight = 260, }) {
    const ref = useRef(null);
    const [mode, setMode] = useState('visual');
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        if (mode === 'visual' && ref.current && ref.current.innerHTML !== value) {
            ref.current.innerHTML = value || '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);
    const exec = (cmd, arg) => {
        ref.current?.focus();
        document.execCommand(cmd, false, arg);
        onChange(ref.current?.innerHTML ?? '');
    };
    const tools = [
        { icon: Bold, cmd: 'bold', label: '加粗' },
        { icon: Italic, cmd: 'italic', label: '斜体' },
        { icon: Heading2, cmd: 'formatBlock', arg: 'h2', label: '二级标题' },
        { icon: Heading3, cmd: 'formatBlock', arg: 'h3', label: '三级标题' },
        { icon: List, cmd: 'insertUnorderedList', label: '无序列表' },
        { icon: ListOrdered, cmd: 'insertOrderedList', label: '有序列表' },
        { icon: Quote, cmd: 'formatBlock', arg: 'blockquote', label: '引用' },
    ];
    return (_jsxs("div", { className: cn('overflow-hidden rounded-2xl border transition-all duration-300', focused ? 'border-primary/45 shadow-[0_0_0_3px_hsl(var(--primary)/.14)]' : 'border-white/10'), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1 border-b border-white/8 bg-white/[0.03] px-2 py-1.5", children: [mode === 'visual' &&
                        tools.map((t) => (_jsx("button", { type: "button", title: t.label, onMouseDown: (e) => e.preventDefault(), onClick: () => exec(t.cmd, t.arg), className: "rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", children: _jsx(t.icon, { className: "h-[15px] w-[15px]" }) }, t.label))), mode === 'visual' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "mx-1 h-4 w-px bg-white/12" }), _jsx("button", { type: "button", title: "\u63D2\u5165\u94FE\u63A5", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                    const url = window.prompt('输入链接地址', 'https://');
                                    if (url)
                                        exec('createLink', url);
                                }, className: "rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", children: _jsx(Link2, { className: "h-[15px] w-[15px]" }) }), _jsx("button", { type: "button", title: "\u63D2\u5165\u56FE\u7247 URL", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                                    const url = window.prompt('输入图片地址', 'https://');
                                    if (url)
                                        exec('insertImage', url);
                                }, className: "rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", children: _jsx(ImageIcon, { className: "h-[15px] w-[15px]" }) })] })), _jsx("div", { className: "ml-auto flex items-center gap-1", children: _jsxs("button", { type: "button", onClick: () => setMode(mode === 'visual' ? 'html' : 'visual'), className: cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition', mode === 'html' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'), children: [_jsx(Code2, { className: "h-3.5 w-3.5" }), mode === 'html' ? '返回可视化' : 'HTML 源码'] }) })] }), mode === 'visual' ? (_jsx("div", { ref: ref, contentEditable: true, suppressContentEditableWarning: true, onInput: () => onChange(ref.current?.innerHTML ?? ''), onFocus: () => setFocused(true), onBlur: () => setFocused(false), "data-placeholder": placeholder, className: "prose-glass max-w-none px-4 py-4 outline-none empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)]", style: { minHeight } })) : (_jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), onFocus: () => setFocused(true), onBlur: () => setFocused(false), spellCheck: false, className: "mono w-full resize-y bg-transparent px-4 py-4 text-[13px] leading-relaxed outline-none", style: { minHeight }, placeholder: "<p>HTML \u6E90\u7801</p>" }))] }));
}
/* =============================================================================
 * 标签输入（字符串数组）
 * ========================================================================== */
export function TagInput({ value, onChange, placeholder = '输入后回车添加' }) {
    const [draft, setDraft] = useState('');
    const add = () => {
        const t = draft.trim();
        if (t && !value.includes(t))
            onChange([...value, t]);
        setDraft('');
    };
    return (_jsxs("div", { className: "flex min-h-[44px] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2", children: [value.map((t) => (_jsxs("span", { className: "chip inline-flex items-center gap-1.5 !py-1", children: [t, _jsx("button", { type: "button", onClick: () => onChange(value.filter((x) => x !== t)), className: "transition hover:text-foreground", children: _jsx(X, { className: "h-3 w-3" }) })] }, t))), _jsx("input", { value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        add();
                    }
                    else if (e.key === 'Backspace' && !draft && value.length)
                        onChange(value.slice(0, -1));
                }, onBlur: add, placeholder: value.length ? '' : placeholder, className: "min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" })] }));
}
/* =============================================================================
 * 列表输入（多行文本 → 字符串数组）
 * ========================================================================== */
export function ListInput({ value, onChange, placeholder = '每行一项', rows = 4, }) {
    const [text, setText] = useState(value.join('\n'));
    useEffect(() => {
        const next = value.join('\n');
        setText((cur) => (cur.split('\n').filter(Boolean).join('\n') === next ? cur : next));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.join('\u0001')]);
    return (_jsx(Textarea, { rows: rows, value: text, placeholder: placeholder, onChange: (e) => {
            setText(e.target.value);
            onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean));
        } }));
}
/* =============================================================================
 * 图片选择器（URL + 上传）
 * ========================================================================== */
export function ImagePicker({ value, onChange, label = '选择图片', aspect = 'aspect-video', }) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);
    const toast = useToast();
    const upload = async (files) => {
        if (!files?.length)
            return;
        setUploading(true);
        try {
            const out = await AdminApi.upload([files[0]]);
            if (out[0])
                onChange(out[0].url);
            toast.success('上传成功');
        }
        catch (e) {
            toast.error('上传失败', e.message);
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("div", { className: cn('group relative w-full overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03] transition', aspect), onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
                    e.preventDefault();
                    void upload(e.dataTransfer.files);
                }, children: value ? (_jsxs(_Fragment, { children: [_jsx("img", { src: value, alt: "", className: "h-full w-full object-cover" }), _jsxs("div", { className: "absolute inset-0 flex items-center justify-center gap-2 bg-black/65 opacity-0 transition group-hover:opacity-100", children: [_jsxs(Button, { size: "sm", variant: "glass", onClick: () => inputRef.current?.click(), children: [_jsx(Upload, { className: "h-3.5 w-3.5" }), " \u66FF\u6362"] }), _jsxs(Button, { size: "sm", variant: "danger", onClick: () => onChange(''), children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), " \u79FB\u9664"] })] })] })) : (_jsxs("button", { type: "button", onClick: () => inputRef.current?.click(), className: "flex h-full w-full flex-col items-center justify-center gap-2.5 text-muted-foreground transition hover:text-foreground", children: [uploading ? _jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }) : _jsx(FileUp, { className: "h-6 w-6" }), _jsx("span", { className: "text-xs", children: uploading ? '上传中…' : `${label} · 点击或拖拽` })] })) }), _jsx(Input, { value: value, onChange: (e) => onChange(e.target.value), placeholder: "\u6216\u76F4\u63A5\u7C98\u8D34\u56FE\u7247 URL", className: "text-xs" }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => void upload(e.target.files) })] }));
}
/** 批量图片上传 */
export function MultiImageUpload({ onUploaded }) {
    const [uploading, setUploading] = useState(false);
    const [drag, setDrag] = useState(false);
    const inputRef = useRef(null);
    const toast = useToast();
    const upload = async (files) => {
        const arr = files ? Array.from(files) : [];
        if (!arr.length)
            return;
        setUploading(true);
        try {
            const out = await AdminApi.upload(arr);
            onUploaded(out.map((o) => o.url));
            toast.success(`已上传 ${out.length} 张图片`);
        }
        catch (e) {
            toast.error('上传失败', e.message);
        }
        finally {
            setUploading(false);
            if (inputRef.current)
                inputRef.current.value = '';
        }
    };
    return (_jsxs("div", { onDragOver: (e) => {
            e.preventDefault();
            setDrag(true);
        }, onDragLeave: () => setDrag(false), onDrop: (e) => {
            e.preventDefault();
            setDrag(false);
            void upload(e.dataTransfer.files);
        }, onClick: () => inputRef.current?.click(), className: cn('flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed py-10 transition-all duration-300', drag ? 'border-primary/60 bg-primary/[0.07]' : 'border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.045]'), children: [uploading ? _jsx(Loader2, { className: "h-7 w-7 animate-spin text-primary" }) : _jsx(Upload, { className: "h-7 w-7 text-muted-foreground" }), _jsx("p", { className: "text-sm font-medium", children: uploading ? '上传中…' : '点击或拖拽图片到此处' }), _jsx("p", { className: "text-[11px] text-muted-foreground", children: "\u652F\u6301 JPG / PNG / WebP / GIF\uFF0C\u5355\u5F20\u4E0D\u8D85\u8FC7 30MB\uFF0C\u53EF\u591A\u9009" }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: (e) => void upload(e.target.files) })] }));
}
/* =============================================================================
 * 通用字段渲染
 * ========================================================================== */
export function FieldRenderer({ def, value, onChange, mode, }) {
    if (def.only && def.only !== mode)
        return null;
    switch (def.type) {
        case 'textarea':
            return (_jsx(Textarea, { rows: def.rows ?? 4, value: value ?? '', placeholder: def.placeholder, onChange: (e) => onChange(e.target.value) }));
        case 'richtext':
            return _jsx(RichTextEditor, { value: value ?? '', onChange: onChange, placeholder: def.placeholder });
        case 'number':
            return _jsx(Input, { type: "number", value: value ?? '', placeholder: def.placeholder, onChange: (e) => onChange(e.target.value === '' ? null : Number(e.target.value)) });
        case 'select':
            return (_jsxs(Select, { value: value ?? '', onChange: (e) => onChange(e.target.value), children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u2026" }), (def.options ?? []).map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value)))] }));
        case 'date':
            return _jsx(Input, { type: "date", value: (value ?? '').slice(0, 10), onChange: (e) => onChange(e.target.value) });
        case 'datetime':
            return (_jsx(Input, { type: "datetime-local", value: (value ?? '').replace(' ', 'T').slice(0, 16), onChange: (e) => onChange(e.target.value.replace('T', ' ')) }));
        case 'switch':
            return _jsx(Switch, { checked: !!value, onChange: onChange });
        case 'tags':
            return _jsx(TagInput, { value: Array.isArray(value) ? value : [], onChange: onChange });
        case 'list':
            return _jsx(ListInput, { value: Array.isArray(value) ? value : [], onChange: onChange, placeholder: def.placeholder });
        case 'image':
            return _jsx(ImagePicker, { value: value ?? '', onChange: onChange });
        case 'readonly':
            return _jsx("div", { className: "field flex items-center bg-white/[0.02] text-muted-foreground", children: String(value ?? '—') });
        default:
            return _jsx(Input, { value: value ?? '', placeholder: def.placeholder, onChange: (e) => onChange(e.target.value) });
    }
}
export function ResourceManager({ title, description, resource, fields, columns, filters, pageSize = 12, searchPlaceholder, emptyText, catalog, headerActions, onChanged, readOnly, createLabel = '新建', }) {
    const api = useMemo(() => AdminApi.resource(resource), [resource]);
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [filterState, setFilterState] = useState({});
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState(null);
    const [selected, setSelected] = useState([]);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 380);
        return () => clearTimeout(t);
    }, [search]);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.list({ page, pageSize, q: debounced, ...filterState });
            setRows(res.data ?? []);
            setTotal(res.total ?? 0);
        }
        catch (e) {
            toast.error('加载失败', e.message);
            setRows([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api, page, pageSize, debounced, JSON.stringify(filterState)]);
    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);
    const openCreate = () => {
        const init = {};
        for (const f of fields)
            if (f.default !== undefined)
                init[f.name] = f.default;
        for (const f of fields) {
            if (init[f.name] !== undefined)
                continue;
            init[f.name] = f.type === 'switch' ? false : f.type === 'tags' || f.type === 'list' ? [] : '';
        }
        setForm(init);
        setEditing(null);
        setDrawerOpen(true);
    };
    const openEdit = (row) => {
        const init = {};
        for (const f of fields)
            init[f.name] = row[f.name] ?? (f.type === 'tags' || f.type === 'list' ? [] : '');
        setForm(init);
        setEditing(row);
        setDrawerOpen(true);
    };
    const save = async () => {
        const missing = fields.filter((f) => f.required && !form[f.name]);
        if (missing.length) {
            toast.error('请填写必填项', missing.map((f) => f.label).join('、'));
            return;
        }
        setSaving(true);
        try {
            const payload = {};
            for (const f of fields) {
                if (f.type === 'readonly')
                    continue;
                if (f.only === 'create' && editing)
                    continue;
                if (f.only === 'edit' && !editing)
                    continue;
                payload[f.name] = form[f.name];
            }
            if (editing)
                await api.update(editing.id, payload);
            else
                await api.create(payload);
            toast.success(editing ? '已保存修改' : '创建成功');
            setDrawerOpen(false);
            await load();
            onChanged?.();
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const remove = async () => {
        if (!confirmDel)
            return;
        try {
            await api.remove(confirmDel.id);
            toast.success('已删除');
            setConfirmDel(null);
            await load();
            onChanged?.();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
    };
    const filterDefs = filters?.({ filters: filterState, setFilter: (k, v) => {
            setPage(1);
            setFilterState((s) => ({ ...s, [k]: v }));
        } });
    return (_jsxs(AdminPage, { title: title, description: description, breadcrumb: "\u540E\u53F0\u7BA1\u7406", actions: _jsxs(_Fragment, { children: [headerActions, _jsxs(Button, { variant: "glass", onClick: () => void load(), disabled: loading, children: [_jsx(RefreshCw, { className: cn('h-3.5 w-3.5', loading && 'animate-spin') }), "\u5237\u65B0"] }), !readOnly && (_jsxs(Button, { variant: "primary", onClick: openCreate, children: [_jsx(Plus, { className: "h-4 w-4" }), createLabel] }))] }), children: [_jsx(FilterBar, { search: search, onSearch: setSearch, placeholder: searchPlaceholder ?? `搜索${title}…`, filters: filterDefs }), _jsx(DataTable, { columns: collColumns(columns, catalog), rows: rows, loading: loading, empty: emptyText ?? `暂无${title}`, emptyDescription: readOnly ? undefined : `点击右上角「${createLabel}」添加第一条记录`, selectable: !readOnly, selected: selected, onSelectedChange: setSelected, page: page, pageSize: pageSize, total: total, onPageChange: setPage, rowActions: readOnly
                    ? undefined
                    : (row) => (_jsxs(_Fragment, { children: [_jsx(RowBtn, { icon: Pencil, label: "\u7F16\u8F91", tone: "primary", onClick: () => openEdit(row) }), _jsx(RowBtn, { icon: Trash2, label: "\u5220\u9664", tone: "danger", onClick: () => setConfirmDel(row) })] })) }), _jsx(Drawer, { open: drawerOpen, onClose: () => setDrawerOpen(false), title: editing ? `编辑${title}` : `${createLabel}${title}`, width: "max-w-3xl", footer: _jsxs("div", { className: "flex items-center justify-end gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setDrawerOpen(false), disabled: saving, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: save, loading: saving, children: "\u4FDD\u5B58" })] }), children: _jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: fields
                        .filter((f) => !f.only || f.only === (editing ? 'edit' : 'create'))
                        .map((f) => (_jsx("div", { className: cn(f.wide || ['richtext', 'textarea', 'image'].includes(f.type) ? 'sm:col-span-2' : ''), children: _jsx(Field, { label: f.label, hint: f.hint, required: f.required, children: _jsx(FieldRenderer, { def: f, value: form[f.name], mode: editing ? 'edit' : 'create', onChange: (v) => setForm((s) => ({ ...s, [f.name]: v })) }) }) }, f.name))) }) }), _jsx(ConfirmDialog, { open: !!confirmDel, onClose: () => setConfirmDel(null), onConfirm: remove, title: `删除${title}`, description: _jsxs(_Fragment, { children: ["\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002", confirmDel && (_jsxs("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: ["#", confirmDel.id, " \u00B7 ", plain(confirmDel.title ?? confirmDel.name ?? '', 60)] }))] }) })] }));
}
/** 在首列插入序号 */
function collColumns(columns, catalog) {
    const idx = {
        key: '__idx',
        title: '#',
        width: '56px',
        render: (_r, i) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: String(i + 1).padStart(2, '0') }),
    };
    const out = [idx, ...columns];
    if (catalog) {
        out.push({
            key: '__catalog',
            title: '状态',
            width: '110px',
            render: (r) => catalog(r),
        });
    }
    return out;
}
/* =============================================================================
 * 状态徽章
 * ========================================================================== */
export function StatusChip({ status, labels }) {
    const map = {
        published: { tone: 'success', text: '已发布' },
        draft: { tone: 'muted', text: '草稿' },
        pending: { tone: 'warning', text: '待审核' },
        reviewing: { tone: 'warning', text: '审核中' },
        approved: { tone: 'success', text: '已通过' },
        rejected: { tone: 'danger', text: '未通过' },
        ended: { tone: 'muted', text: '已结束' },
        open: { tone: 'warning', text: '待处理' },
        replied: { tone: 'success', text: '已回复' },
        closed: { tone: 'muted', text: '已关闭' },
    };
    const t = map[status] ?? { tone: 'primary', text: labels?.[status] ?? status };
    return (_jsx(Chip, { tone: t.tone, className: "!px-2.5 !py-0.5", children: labels?.[status] ?? t.text }));
}
/* =============================================================================
 * 简易图表（无依赖 SVG）
 * ========================================================================== */
export function MiniBars({ data, labels, height = 120, tone = 'primary', }) {
    const max = Math.max(1, ...data);
    return (_jsx("div", { className: "flex items-end gap-1.5", style: { height }, children: data.map((v, i) => (_jsxs("div", { className: "group relative flex-1", children: [_jsx("div", { className: cn('w-full rounded-t-md transition-all duration-500', tone === 'primary'
                        ? 'bg-primary/70'
                        : 'bg-[hsl(var(--accent))]/70'), style: { height: Math.max(2, (v / max) * height) } }), _jsxs("div", { className: "pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-black/85 px-2 py-1 text-[10px] opacity-0 backdrop-blur transition group-hover:opacity-100", children: [labels?.[i] ?? '', " ", v] })] }, i))) }));
}
export function Sparkline({ data, className, tone = '#38BDF8' }) {
    if (data.length < 2)
        return _jsx("div", { className: cn('h-10', className) });
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - ((v - min) / range) * 36}`).join(' ');
    return (_jsxs("svg", { viewBox: "0 0 100 40", preserveAspectRatio: "none", className: cn('h-10 w-full', className), children: [_jsx("polyline", { points: pts, fill: "none", stroke: tone, strokeWidth: "1.6", vectorEffect: "non-scaling-stroke" }), _jsx("polyline", { points: `0,40 ${pts} 100,40`, fill: tone, opacity: "0.10", stroke: "none" })] }));
}
/* =============================================================================
 * 条形占比列表
 * ========================================================================== */
export function BarList({ items, tone = 'primary' }) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return (_jsx("div", { className: "flex flex-col gap-3.5", children: items.map((it) => (_jsxs("div", { children: [_jsxs("div", { className: "mb-1.5 flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-foreground/80", children: it.name }), _jsx("span", { className: "mono text-muted-foreground", children: it.value })] }), _jsx("div", { className: "h-1.5 overflow-hidden rounded-full bg-white/8", children: _jsx("div", { className: "h-full rounded-full bg-primary/70 transition-all duration-700", style: { width: `${(it.value / max) * 100}%` } }) })] }, it.name))) }));
}
/* =============================================================================
 * 二维码卡片（签到用）
 * ========================================================================== */
export function QrPanel({ payload, title, subtitle }) {
    const [svg, setSvg] = useState('');
    useEffect(() => {
        let alive = true;
        import('@/lib/qrcode').then(({ qrSvg }) => {
            if (alive)
                setSvg(qrSvg(payload, { ecl: 'M', dark: '#0B0F14', light: '#FFFFFF', quiet: 3 }));
        });
        return () => {
            alive = false;
        };
    }, [payload]);
    return (_jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx(Glass, { tone: "strong", className: "p-4", children: _jsx("div", { className: "h-[220px] w-[220px] rounded-xl bg-white p-1 [&>svg]:h-full [&>svg]:w-full", dangerouslySetInnerHTML: { __html: svg } }) }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm font-medium", children: title }), subtitle && _jsx("p", { className: "mono mt-1 text-[11px] text-muted-foreground", children: subtitle })] }), _jsx("p", { className: "max-w-[260px] text-center text-[11px] leading-relaxed text-muted-foreground", children: "\u53C2\u4F1A\u540C\u5B66\u626B\u7801\u7B7E\u5230\u3002\u4E5F\u53EF\u5728\u300C\u62A5\u540D\u540D\u5355\u300D\u4E2D\u624B\u52A8\u52FE\u9009\u7B7E\u5230\u72B6\u6001\u3002" })] }));
}
/* =============================================================================
 * 审核操作组
 * ========================================================================== */
export function ReviewActions({ current, onReview, }) {
    const [noteOpen, setNoteOpen] = useState(null);
    const [note, setNote] = useState('');
    const btn = (status, label, tone) => (_jsx(Button, { size: "sm", variant: tone, disabled: current === status, onClick: () => {
            if (status === 'rejected') {
                setNoteOpen(status);
                setNote('');
            }
            else
                onReview(status);
        }, children: label }));
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-end gap-1.5", children: [btn('reviewing', '受理', 'glass'), btn('approved', '通过', 'primary'), btn('rejected', '驳回', 'danger')] }), _jsx(Modal, { open: !!noteOpen, onClose: () => setNoteOpen(null), title: "\u9A73\u56DE\u5E76\u8BF4\u660E\u539F\u56E0", size: "sm", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setNoteOpen(null), children: "\u53D6\u6D88" }), _jsx(Button, { variant: "danger", onClick: () => {
                                onReview('rejected', note);
                                setNoteOpen(null);
                            }, children: "\u786E\u8BA4\u9A73\u56DE" })] }), children: _jsx(Field, { label: "\u5BA1\u6838\u610F\u89C1", hint: "\u8BE5\u610F\u89C1\u5C06\u968F\u7AD9\u5185\u6D88\u606F\u53D1\u9001\u7ED9\u7533\u8BF7\u4EBA", children: _jsx(Textarea, { rows: 4, value: note, onChange: (e) => setNote(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u9009\u9898\u91CD\u590D\u5EA6\u8F83\u9AD8\uFF0C\u5EFA\u8BAE\u8C03\u6574\u7814\u7A76\u89D2\u5EA6\u540E\u91CD\u65B0\u7533\u62A5\u3002" }) }) })] }));
}
/* =============================================================================
 * 导出按钮（CSV）
 * ========================================================================== */
export function ExportButton({ kind, params, label = '导出 CSV', }) {
    const toast = useToast();
    const download = async () => {
        try {
            const url = AdminApi.exportUrl(kind, params ?? {});
            const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
            if (!res.ok)
                throw new Error(`导出失败（${res.status}）`);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const cd = res.headers.get('content-disposition') ?? '';
            const m = /filename="?([^"]+)"?/.exec(cd);
            a.download = m ? decodeURIComponent(m[1]) : `${kind}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('导出完成', '文件已开始下载');
        }
        catch (e) {
            toast.error('导出失败', e.message);
        }
    };
    return (_jsxs(Button, { variant: "glass", onClick: download, children: [_jsx(FileUp, { className: "h-3.5 w-3.5" }), label] }));
}
