/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { useRef, useState } from 'react';
import { Check, Copy, Download, HardDrive, Upload } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useReveal, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { RESOURCE_CATEGORIES, fbytes, fdate, fnum } from '@/lib/utils';
import { Button, Chip, Glass } from '@/components/ui';
import { ResourceManager, type Column, type FieldDef } from '@/components/AdminKit';

/* =============================================================================
 * 资源中心 —— /admin/resources
 * 维护报名模板 / 活动资料 / 科普材料 / 竞赛指南 / 常见问题，并支持直接上传文件
 * ========================================================================== */

interface ResourceRow {
  id: number;
  title: string;
  category: string;
  description: string;
  url: string;
  fileType: string;
  fileSize: number;
  downloads: number;
  external: boolean;
  sortOrder: number;
  createdAt: string;
}

const CAT_TONE: Record<string, 'primary' | 'warning' | 'accent' | 'success' | 'default'> = {
  template: 'primary',
  policy: 'warning',
  guide: 'accent',
  training: 'success',
  faq: 'default',
};

const FILE_TYPES = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'ZIP', '其他'];

const FIELDS: FieldDef[] = [
  {
    name: 'title',
    label: '资源标题',
    type: 'text',
    required: true,
    wide: true,
    placeholder: '例如：科技比赛报名表模板',
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    default: 'template',
    options: Object.entries(RESOURCE_CATEGORIES).map(([value, label]) => ({ value, label })),
  },
  {
    name: 'fileType',
    label: '文件类型',
    type: 'select',
    default: 'PDF',
    options: FILE_TYPES.map((v) => ({ value: v, label: v })),
  },
  {
    name: 'fileSize',
    label: '文件大小（字节）',
    type: 'number',
    hint: '上传后会返回字节数，例如 86000 ≈ 84 KB',
  },
  {
    name: 'downloads',
    label: '下载次数',
    type: 'number',
    default: 0,
    hint: '门户每次下载会自动累加，可手动校正',
  },
  {
    name: 'sortOrder',
    label: '排序权重',
    type: 'number',
    default: 0,
    hint: '数字越小越靠前',
  },
  {
    name: 'external',
    label: '外部链接',
    type: 'switch',
    hint: '开启后点击直接跳转外部地址，不占用站内下载统计',
  },
  {
    name: 'url',
    label: '文件地址',
    type: 'text',
    wide: true,
    placeholder: '/uploads/2026-03/xxx.pdf 或 https://…',
    hint: '可用上方「上传文件」获得地址后粘贴到这里',
  },
  {
    name: 'description',
    label: '资源说明',
    type: 'textarea',
    wide: true,
    rows: 3,
    hint: '说明适用对象与使用方式，建议 40~80 字',
    placeholder: '例如：适用于科技比赛报名，含填写示例与常见问题说明。',
  },
];

const COLUMNS: Column<ResourceRow>[] = [
  {
    key: 'title',
    title: '资源标题',
    width: '30%',
    render: (r) => (
      <div className="min-w-0">
        <p className="clamp-1 flex max-w-[320px] items-center gap-1.5 text-[13px] font-medium" title={r.title}>
          {r.title}
          {r.external && (
            <Chip tone="default" className="!py-0 !text-[10px]">
              外链
            </Chip>
          )}
        </p>
        {!!r.description && (
          <p className="clamp-1 mt-0.5 max-w-[310px] text-[11px] text-muted-foreground">{r.description}</p>
        )}
      </div>
    ),
  },
  {
    key: 'category',
    title: '类别',
    width: '108px',
    render: (r) => (
      <Chip tone={CAT_TONE[r.category] ?? 'default'} className="!px-2.5 !py-0.5">
        {RESOURCE_CATEGORIES[r.category] ?? r.category}
      </Chip>
    ),
  },
  {
    key: 'file',
    title: '文件类型 / 大小',
    width: '150px',
    render: (r) => (
      <span className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
        <HardDrive className="h-3.5 w-3.5 opacity-60" />
        {r.fileType || '—'}
        <span className="text-muted-foreground/60">·</span>
        {fbytes(r.fileSize)}
      </span>
    ),
  },
  {
    key: 'downloads',
    title: '下载次数',
    width: '100px',
    render: (r) => (
      <span className="mono flex items-center gap-1.5 text-xs text-foreground/80">
        <Download className="h-3.5 w-3.5 opacity-60" />
        {fnum(r.downloads)}
      </span>
    ),
  },
  {
    key: 'sortOrder',
    title: '排序',
    width: '72px',
    render: (r) => <span className="mono text-xs text-muted-foreground">{r.sortOrder ?? 0}</span>,
  },
  {
    key: 'createdAt',
    title: '创建时间',
    width: '112px',
    render: (r) => <span className="mono text-xs text-muted-foreground">{fdate(r.createdAt)}</span>,
  },
];

/* ---------------------------------------------------------------------------
 * 文件上传控件（任意类型文件，上传后把地址复制到剪贴板，便于粘贴进表单）
 * ------------------------------------------------------------------------- */
function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [last, setLast] = useState<{ url: string; name: string; size: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setCopied(false);
    try {
      const out = await AdminApi.upload([file]);
      const r = out?.[0];
      if (!r?.url) throw new Error('上传未返回文件地址');
      setLast(r);
      let tip = `文件地址：${r.url}`;
      try {
        await navigator.clipboard.writeText(r.url);
        setCopied(true);
        tip = `文件地址已复制到剪贴板：${r.url}`;
      } catch {
        /* 剪贴板不可用时仅提示地址 */
      }
      toast.success(`已上传 ${r.name}（${fbytes(r.size)}）`, tip);
    } catch (e: any) {
      toast.error('上传失败', e?.message ?? '请稍后重试');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const copy = async () => {
    if (!last?.url) return;
    try {
      await navigator.clipboard.writeText(last.url);
      setCopied(true);
      toast.success('已复制文件地址', last.url);
    } catch {
      toast.error('复制失败', '请手动选中地址后复制');
    }
  };

  return (
    <Glass tone="soft" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Upload className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">上传文件</p>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
              支持 PDF / Word / PPT / Excel / ZIP 等任意文件，单个不超过 30MB。上传成功后地址会自动复制到剪贴板，
              粘贴到「新建 / 编辑资源」抽屉的「文件地址」字段即可。
            </p>
          </div>
        </div>
        <Button variant="primary" loading={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {uploading ? '上传中…' : '上传文件'}
        </Button>
        <input ref={inputRef} type="file" hidden onChange={(e) => void upload(e.target.files)} />
      </div>

      {last && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="clamp-1 max-w-[240px] text-xs text-foreground/85" title={last.name}>
            {last.name}
          </span>
          <span className="mono text-[11px] text-muted-foreground">
            {fbytes(last.size)} · {last.size} 字节
          </span>
          <span className="mono clamp-1 min-w-0 flex-1 text-[11px] text-primary/90">{last.url}</span>
          <Button size="sm" variant="glass" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制地址'}
          </Button>
        </div>
      )}
    </Glass>
  );
}

export default function Resources() {
  useTitle('资源中心');
  const reveal = useReveal<HTMLDivElement>();

  return (
    <div className="flex flex-col gap-6">
      <div ref={reveal} data-reveal>
        <FileUploader />
      </div>

      <ResourceManager<ResourceRow>
        title="资源中心"
        description="维护活动资料、科普材料、竞赛指南、培训资料与常见问题；支持上传文件、外部链接与排序权重。"
        resource="resources"
        fields={FIELDS}
        columns={COLUMNS}
        pageSize={12}
        searchPlaceholder="搜索资源标题或说明…"
        emptyText="暂无资源"
        createLabel="新建资源"
        filters={({ filters, setFilter }) => [
          {
            name: 'category',
            label: '分类',
            value: filters.category ?? '',
            options: [
              { value: '', label: '全部分类' },
              ...Object.entries(RESOURCE_CATEGORIES).map(([value, label]) => ({ value, label })),
            ],
            onChange: (v) => setFilter('category', v),
          },
        ]}
      />
    </div>
  );
}
