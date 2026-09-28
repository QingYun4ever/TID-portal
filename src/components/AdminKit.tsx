import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Eye,
  FileUp,
  GripVertical,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AdminApi, qs } from '@/lib/api';
import { cn, fdatetime, plain } from '@/lib/utils';
import { useToast } from '@/lib/store';
import {
  Button,
  Chip,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Glass,
  GlassCard,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Switch,
  Td,
  Textarea,
  Th,
  TableWrap,
} from './ui';

/* =============================================================================
 * 后台页面骨架
 * ========================================================================== */
export function AdminPage({
  title,
  description,
  actions,
  children,
  breadcrumb,
  icon,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  breadcrumb?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {breadcrumb && <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{breadcrumb}</p>}
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* =============================================================================
 * 统计卡片
 * ========================================================================== */
export function StatTile({
  label,
  value,
  hint,
  tone = 'primary',
  icon,
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
    danger: 'text-[hsl(var(--destructive))]',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'lg-soft lg-refract relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300',
        onClick && 'hover:-translate-y-0.5 hover:border-white/20',
        active ? 'border-primary/45 bg-primary/[0.07]' : 'border-white/8'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className={cn('opacity-75', tones[tone])}>{icon}</span>}
      </div>
      <div className={cn('mono mt-2.5 text-xl font-semibold tabular-nums', tones[tone])}>{value}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

/* =============================================================================
 * 工具栏（搜索 + 筛选）
 * ========================================================================== */
export interface FilterDef {
  name: string;
  label?: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  onChange: (v: string) => void;
}

export function FilterBar({
  search,
  onSearch,
  placeholder = '搜索…',
  filters = [],
  extra,
  className,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  filters?: FilterDef[];
  extra?: React.ReactNode;
  className?: string;
}) {
  return (
    <Glass tone="soft" className={cn('flex flex-wrap items-center gap-3 p-3', className)}>
      {onSearch && (
        <SearchInput
          value={search ?? ''}
          onChange={onSearch}
          placeholder={placeholder}
          className="min-w-[200px] flex-1"
        />
      )}
      {filters.map((f) => (
        <Select key={f.name} value={f.value} onChange={(e) => f.onChange(e.target.value)} className="w-auto min-w-[140px]">
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {o.count !== undefined ? `（${o.count}）` : ''}
            </option>
          ))}
        </Select>
      ))}
      {extra}
    </Glass>
  );
}

/* =============================================================================
 * 数据表格
 * ========================================================================== */
export interface Column<T> {
  key: string;
  title: React.ReactNode;
  width?: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  empty,
  emptyDescription,
  selectable,
  selected,
  onSelectedChange,
  onRowClick,
  rowActions,
  page,
  pageSize,
  total,
  onPageChange,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  emptyDescription?: string;
  selectable?: boolean;
  selected?: number[];
  onSelectedChange?: (ids: number[]) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  dense?: boolean;
}) {
  const sel = selected ?? [];
  const allChecked = rows.length > 0 && rows.every((r) => sel.includes(r.id));

  if (loading)
    return (
      <Glass tone="soft" className="p-4">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </Glass>
    );

  if (!rows.length)
    return (
      <Glass tone="soft">
        <EmptyState title={empty ?? '暂无数据'} description={emptyDescription} />
      </Glass>
    );

  return (
    <div className="flex flex-col gap-4">
      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {selectable && (
                <Th className="w-10">
                  <button
                    onClick={() => onSelectedChange?.(allChecked ? [] : rows.map((r) => r.id))}
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-[5px] border transition',
                      allChecked ? 'border-primary bg-primary' : 'border-white/25 hover:border-white/45'
                    )}
                    aria-label="全选"
                  >
                    {allChecked && <Check className="h-3 w-3 text-[hsl(var(--primary-foreground))]" strokeWidth={3.5} />}
                  </button>
                </Th>
              )}
              {columns.map((c) => (
                <Th key={c.key} style={{ width: c.width }} className={c.className}>
                  {c.title}
                </Th>
              ))}
              {rowActions && <Th className="w-28 text-right">操作</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors duration-200',
                  onRowClick && 'cursor-pointer',
                  sel.includes(row.id) ? 'bg-primary/[0.055]' : 'hover:bg-white/[0.03]'
                )}
              >
                {selectable && (
                  <Td className="w-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectedChange?.(sel.includes(row.id) ? sel.filter((x) => x !== row.id) : [...sel, row.id]);
                      }}
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-[5px] border transition',
                        sel.includes(row.id) ? 'border-primary bg-primary' : 'border-white/25 hover:border-white/45'
                      )}
                      aria-label="选择"
                    >
                      {sel.includes(row.id) && (
                        <Check className="h-3 w-3 text-[hsl(var(--primary-foreground))]" strokeWidth={3.5} />
                      )}
                    </button>
                  </Td>
                )}
                {columns.map((c) => (
                  <Td key={c.key} className={cn(dense && 'py-2', c.className)}>
                    {c.render(row, i)}
                  </Td>
                ))}
                {rowActions && (
                  <Td className="text-right" onClick={undefined}>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      {page !== undefined && pageSize !== undefined && total !== undefined && onPageChange && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            共 <span className="mono text-foreground">{total}</span> 条 · 第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页
          </p>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * 行内操作按钮
 * ========================================================================== */
export function RowBtn({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: any;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'primary' | 'success';
}) {
  const tones = {
    default: 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
    danger: 'text-muted-foreground hover:bg-[hsl(var(--destructive))]/15 hover:text-[hsl(var(--destructive))]',
    primary: 'text-muted-foreground hover:bg-primary/15 hover:text-primary',
    success: 'text-muted-foreground hover:bg-[hsl(var(--success))]/15 hover:text-[hsl(var(--success))]',
  };
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cn('rounded-lg p-2 transition', tones[tone])}>
      <Icon className="h-[15px] w-[15px]" />
    </button>
  );
}

/* =============================================================================
 * 字段定义（驱动通用表单）
 * ========================================================================== */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'select'
  | 'date'
  | 'datetime'
  | 'switch'
  | 'tags'
  | 'list'
  | 'image'
  | 'images'
  | 'readonly';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** 占满整行 */
  wide?: boolean;
  default?: any;
  /** 仅新建时显示 / 仅编辑时显示 */
  only?: 'create' | 'edit';
  rows?: number;
}

/* =============================================================================
 * 富文本编辑器（contentEditable）
 * ========================================================================== */
export function RichTextEditor({
  value,
  onChange,
  placeholder = '在此撰写内容…',
  minHeight = 260,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (mode === 'visual' && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const exec = (cmd: string, arg?: string) => {
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

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border transition-all duration-300',
        focused ? 'border-primary/45 shadow-[0_0_0_3px_hsl(var(--primary)/.14)]' : 'border-white/10'
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-white/8 bg-white/[0.03] px-2 py-1.5">
        {mode === 'visual' &&
          tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(t.cmd, t.arg)}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <t.icon className="h-[15px] w-[15px]" />
            </button>
          ))}
        {mode === 'visual' && (
          <>
            <span className="mx-1 h-4 w-px bg-white/12" />
            <button
              type="button"
              title="插入链接"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = window.prompt('输入链接地址', 'https://');
                if (url) exec('createLink', url);
              }}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <Link2 className="h-[15px] w-[15px]" />
            </button>
            <button
              type="button"
              title="插入图片 URL"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const url = window.prompt('输入图片地址', 'https://');
                if (url) exec('insertImage', url);
              }}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <ImageIcon className="h-[15px] w-[15px]" />
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === 'visual' ? 'html' : 'visual')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition',
              mode === 'html' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            {mode === 'html' ? '返回可视化' : 'HTML 源码'}
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(ref.current?.innerHTML ?? '')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          data-placeholder={placeholder}
          className="prose-glass max-w-none px-4 py-4 outline-none empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)]"
          style={{ minHeight }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          className="mono w-full resize-y bg-transparent px-4 py-4 text-[13px] leading-relaxed outline-none"
          style={{ minHeight }}
          placeholder="<p>HTML 源码</p>"
        />
      )}
    </div>
  );
}

/* =============================================================================
 * 标签输入（字符串数组）
 * ========================================================================== */
export function TagInput({ value, onChange, placeholder = '输入后回车添加' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
      {value.map((t) => (
        <span key={t} className="chip inline-flex items-center gap-1.5 !py-1">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="transition hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}

/* =============================================================================
 * 列表输入（多行文本 → 字符串数组）
 * ========================================================================== */
export function ListInput({
  value,
  onChange,
  placeholder = '每行一项',
  rows = 4,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => {
    const next = value.join('\n');
    setText((cur) => (cur.split('\n').filter(Boolean).join('\n') === next ? cur : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('\u0001')]);
  return (
    <Textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

/* =============================================================================
 * 图片选择器（URL + 上传）
 * ========================================================================== */
export function ImagePicker({
  value,
  onChange,
  label = '选择图片',
  aspect = 'aspect-video',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const out = await AdminApi.upload([files[0]]);
      if (out[0]) onChange(out[0].url);
      toast.success('上传成功');
    } catch (e: any) {
      toast.error('上传失败', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03] transition',
          aspect
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/65 opacity-0 transition group-hover:opacity-100">
              <Button size="sm" variant="glass" onClick={() => inputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> 替换
              </Button>
              <Button size="sm" variant="danger" onClick={() => onChange('')}>
                <Trash2 className="h-3.5 w-3.5" /> 移除
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2.5 text-muted-foreground transition hover:text-foreground"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <FileUp className="h-6 w-6" />}
            <span className="text-xs">{uploading ? '上传中…' : `${label} · 点击或拖拽`}</span>
          </button>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="或直接粘贴图片 URL"
        className="text-xs"
      />
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files)} />
    </div>
  );
}

/** 批量图片上传 */
export function MultiImageUpload({ onUploaded }: { onUploaded: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (files: FileList | File[] | null) => {
    const arr = files ? Array.from(files as FileList) : [];
    if (!arr.length) return;
    setUploading(true);
    try {
      const out = await AdminApi.upload(arr);
      onUploaded(out.map((o) => o.url));
      toast.success(`已上传 ${out.length} 张图片`);
    } catch (e: any) {
      toast.error('上传失败', e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void upload(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed py-10 transition-all duration-300',
        drag ? 'border-primary/60 bg-primary/[0.07]' : 'border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.045]'
      )}
    >
      {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
      <p className="text-sm font-medium">{uploading ? '上传中…' : '点击或拖拽图片到此处'}</p>
      <p className="text-[11px] text-muted-foreground">支持 JPG / PNG / WebP / GIF，单张不超过 30MB，可多选</p>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
    </div>
  );
}

/* =============================================================================
 * 通用字段渲染
 * ========================================================================== */
export function FieldRenderer({
  def,
  value,
  onChange,
  mode,
}: {
  def: FieldDef;
  value: any;
  onChange: (v: any) => void;
  mode: 'create' | 'edit';
}) {
  if (def.only && def.only !== mode) return null;

  switch (def.type) {
    case 'textarea':
      return (
        <Textarea rows={def.rows ?? 4} value={value ?? ''} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />
      );
    case 'richtext':
      return <RichTextEditor value={value ?? ''} onChange={onChange} placeholder={def.placeholder} />;
    case 'number':
      return <Input type="number" value={value ?? ''} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'select':
      return (
        <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">请选择…</option>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case 'date':
      return <Input type="date" value={(value ?? '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={(value ?? '').replace(' ', 'T').slice(0, 16)}
          onChange={(e) => onChange(e.target.value.replace('T', ' '))}
        />
      );
    case 'switch':
      return <Switch checked={!!value} onChange={onChange} />;
    case 'tags':
      return <TagInput value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case 'list':
      return <ListInput value={Array.isArray(value) ? value : []} onChange={onChange} placeholder={def.placeholder} />;
    case 'image':
      return <ImagePicker value={value ?? ''} onChange={onChange} />;
    case 'readonly':
      return <div className="field flex items-center bg-white/[0.02] text-muted-foreground">{String(value ?? '—')}</div>;
    default:
      return <Input value={value ?? ''} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}

/* =============================================================================
 * 通用资源管理器（列表 + 抽屉表单）
 * ========================================================================== */
export interface ResourceManagerProps<T extends { id: number }> {
  title: string;
  description?: string;
  resource: string;
  fields: FieldDef[];
  columns: Column<T>[];
  /** 额外筛选器（如按状态） */
  filters?: (state: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => FilterDef[];
  pageSize?: number;
  searchPlaceholder?: string;
  emptyText?: string;
  catalog?: (row: T) => React.ReactNode;
  extraActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  onChanged?: () => void;
  /** 只读模式（如仅查看） */
  readOnly?: boolean;
  /** 新建按钮文案 */
  createLabel?: string;
}

export function ResourceManager<T extends { id: number }>({
  title,
  description,
  resource,
  fields,
  columns,
  filters,
  pageSize = 12,
  searchPlaceholder,
  emptyText,
  catalog,
  headerActions,
  onChanged,
  readOnly,
  createLabel = '新建',
}: ResourceManagerProps<T>) {
  const api = useMemo(() => AdminApi.resource(resource), [resource]);
  const toast = useToast();

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<T | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 380);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.list({ page, pageSize, q: debounced, ...filterState });
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      toast.error('加载失败', e.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, page, pageSize, debounced, JSON.stringify(filterState)]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const openCreate = () => {
    const init: Record<string, any> = {};
    for (const f of fields) if (f.default !== undefined) init[f.name] = f.default;
    for (const f of fields) {
      if (init[f.name] !== undefined) continue;
      init[f.name] = f.type === 'switch' ? false : f.type === 'tags' || f.type === 'list' ? [] : '';
    }
    setForm(init);
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: T) => {
    const init: Record<string, any> = {};
    for (const f of fields) init[f.name] = (row as any)[f.name] ?? (f.type === 'tags' || f.type === 'list' ? [] : '');
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
      const payload: Record<string, any> = {};
      for (const f of fields) {
        if (f.type === 'readonly') continue;
        if (f.only === 'create' && editing) continue;
        if (f.only === 'edit' && !editing) continue;
        payload[f.name] = form[f.name];
      }
      if (editing) await api.update(editing.id, payload);
      else await api.create(payload);
      toast.success(editing ? '已保存修改' : '创建成功');
      setDrawerOpen(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    try {
      await api.remove(confirmDel.id);
      toast.success('已删除');
      setConfirmDel(null);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    }
  };

  const filterDefs = filters?.({ filters: filterState, setFilter: (k, v) => {
    setPage(1);
    setFilterState((s) => ({ ...s, [k]: v }));
  } });

  return (
    <AdminPage
      title={title}
      description={description}
      breadcrumb="后台管理"
      actions={
        <>
          {headerActions}
          <Button variant="glass" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
          {!readOnly && (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </>
      }
    >
      <FilterBar search={search} onSearch={setSearch} placeholder={searchPlaceholder ?? `搜索${title}…`} filters={filterDefs} />

      <DataTable<T>
        columns={collColumns(columns, catalog)}
        rows={rows}
        loading={loading}
        empty={emptyText ?? `暂无${title}`}
        emptyDescription={readOnly ? undefined : `点击右上角「${createLabel}」添加第一条记录`}
        selectable={!readOnly}
        selected={selected}
        onSelectedChange={setSelected}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        rowActions={
          readOnly
            ? undefined
            : (row) => (
                <>
                  <RowBtn icon={Pencil} label="编辑" tone="primary" onClick={() => openEdit(row)} />
                  <RowBtn icon={Trash2} label="删除" tone="danger" onClick={() => setConfirmDel(row)} />
                </>
              )
        }
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `编辑${title}` : `${createLabel}${title}`}
        width="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              保存
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {fields
            .filter((f) => !f.only || f.only === (editing ? 'edit' : 'create'))
            .map((f) => (
              <div key={f.name} className={cn(f.wide || ['richtext', 'textarea', 'image'].includes(f.type) ? 'sm:col-span-2' : '')}>
                <Field label={f.label} hint={f.hint} required={f.required}>
                  <FieldRenderer def={f} value={form[f.name]} mode={editing ? 'edit' : 'create'} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />
                </Field>
              </div>
            ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        title={`删除${title}`}
        description={
          <>
            确定要删除这条记录吗？此操作不可撤销。
            {confirmDel && (
              <span className="mono mt-2 block text-xs text-muted-foreground">
                #{(confirmDel as any).id} · {plain((confirmDel as any).title ?? (confirmDel as any).name ?? '', 60)}
              </span>
            )}
          </>
        }
      />
    </AdminPage>
  );
}

/** 在首列插入序号 */
function collColumns<T>(columns: Column<T>[], catalog?: (row: T) => React.ReactNode): Column<T>[] {
  const idx: Column<T> = {
    key: '__idx',
    title: '#',
    width: '56px',
    render: (_r, i) => <span className="mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>,
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
export function StatusChip({ status, labels }: { status: string; labels?: Record<string, string> }) {
  const map: Record<string, { tone: string; text: string }> = {
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
  return (
    <Chip tone={t.tone as any} className="!px-2.5 !py-0.5">
      {labels?.[status] ?? t.text}
    </Chip>
  );
}

/* =============================================================================
 * 简易图表（无依赖 SVG）
 * ========================================================================== */
export function MiniBars({
  data,
  labels,
  height = 120,
  tone = 'primary',
}: {
  data: number[];
  labels?: string[];
  height?: number;
  tone?: 'primary' | 'accent';
}) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className={cn(
              'w-full rounded-t-md transition-all duration-500',
              tone === 'primary'
                ? 'bg-primary/70'
                : 'bg-[hsl(var(--accent))]/70'
            )}
            style={{ height: Math.max(2, (v / max) * height) }}
          />
          <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-black/85 px-2 py-1 text-[10px] opacity-0 backdrop-blur transition group-hover:opacity-100">
            {labels?.[i] ?? ''} {v}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data, className, tone = 'hsl(var(--primary))' }: { data: number[]; className?: string; tone?: string }) {
  if (data.length < 2) return <div className={cn('h-10', className)} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - ((v - min) / range) * 36}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={cn('h-10 w-full', className)}>
      <polyline points={pts} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,40 ${pts} 100,40`} fill={tone} opacity="0.10" stroke="none" />
    </svg>
  );
}

/* =============================================================================
 * 条形占比列表
 * ========================================================================== */
export function BarList({ items, tone = 'primary' }: { items: { name: string; value: number }[]; tone?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((it) => (
        <div key={it.name}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-foreground/80">{it.name}</span>
            <span className="mono text-muted-foreground">{it.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-700"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
 * 二维码卡片（签到用）
 * ========================================================================== */
export function QrPanel({ payload, title, subtitle }: { payload: string; title: string; subtitle?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    import('@/lib/qrcode').then(({ qrSvg }) => {
      if (alive) setSvg(qrSvg(payload, { ecl: 'M', dark: '#0B0F14', light: '#FFFFFF', quiet: 3 }));
    });
    return () => {
      alive = false;
    };
  }, [payload]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Glass tone="strong" className="p-4">
        <div
          className="h-[220px] w-[220px] rounded-xl bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </Glass>
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="mono mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <p className="max-w-[260px] text-center text-[11px] leading-relaxed text-muted-foreground">
        参会同学扫码签到。也可在「报名名单」中手动勾选签到状态。
      </p>
    </div>
  );
}

/* =============================================================================
 * 审核操作组
 * ========================================================================== */
export function ReviewActions({
  current,
  onReview,
}: {
  current: string;
  onReview: (status: string, note?: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const btn = (status: string, label: string, tone: 'primary' | 'danger' | 'glass') => (
    <Button
      size="sm"
      variant={tone}
      disabled={current === status}
      onClick={() => {
        if (status === 'rejected') {
          setNoteOpen(status);
          setNote('');
        } else onReview(status);
      }}
    >
      {label}
    </Button>
  );

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {btn('reviewing', '受理', 'glass')}
        {btn('approved', '通过', 'primary')}
        {btn('rejected', '驳回', 'danger')}
      </div>
      <Modal
        open={!!noteOpen}
        onClose={() => setNoteOpen(null)}
        title="驳回并说明原因"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteOpen(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onReview('rejected', note);
                setNoteOpen(null);
              }}
            >
              确认驳回
            </Button>
          </>
        }
      >
        <Field label="审核意见" hint="该意见将随站内消息发送给申请人">
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：选题重复度较高，建议调整研究角度后重新申报。" />
        </Field>
      </Modal>
    </>
  );
}

/* =============================================================================
 * 导出按钮（CSV）
 * ========================================================================== */
export function ExportButton({
  kind,
  params,
  label = '导出 CSV',
}: {
  kind: string;
  params?: Record<string, string | number>;
  label?: string;
}) {
  const toast = useToast();
  const download = async () => {
    try {
      const url = AdminApi.exportUrl(kind, params ?? {});
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`导出失败（${res.status}）`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get('content-disposition') ?? '';
      const m = /filename="?([^"]+)"?/.exec(cd);
      a.download = m ? decodeURIComponent(m[1]) : `${kind}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('导出完成', '文件已开始下载');
    } catch (e: any) {
      toast.error('导出失败', e.message);
    }
  };
  return (
    <Button variant="glass" onClick={download}>
      <FileUp className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
