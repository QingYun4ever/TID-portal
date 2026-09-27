import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useRef, useState } from 'react';
import { Check, Copy, Download, HardDrive, Upload } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useReveal, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { RESOURCE_CATEGORIES, fbytes, fdate, fnum } from '@/lib/utils';
import { Button, Chip, Glass } from '@/components/ui';
import { ResourceManager } from '@/components/AdminKit';
const CAT_TONE = {
    template: 'primary',
    policy: 'warning',
    guide: 'accent',
    training: 'success',
    faq: 'default',
};
const FILE_TYPES = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'ZIP', '其他'];
const FIELDS = [
    {
        name: 'title',
        label: '资源标题',
        type: 'text',
        required: true,
        wide: true,
        placeholder: '例如：大学生创新创业训练计划项目申报书模板',
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
        placeholder: '例如：适用于创新训练项目立项申报，含填写示例与常见问题说明。',
    },
];
const COLUMNS = [
    {
        key: 'title',
        title: '资源标题',
        width: '30%',
        render: (r) => (_jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "clamp-1 flex max-w-[320px] items-center gap-1.5 text-[13px] font-medium", title: r.title, children: [r.title, r.external && (_jsx(Chip, { tone: "default", className: "!py-0 !text-[10px]", children: "\u5916\u94FE" }))] }), !!r.description && (_jsx("p", { className: "clamp-1 mt-0.5 max-w-[310px] text-[11px] text-muted-foreground", children: r.description }))] })),
    },
    {
        key: 'category',
        title: '类别',
        width: '108px',
        render: (r) => (_jsx(Chip, { tone: CAT_TONE[r.category] ?? 'default', className: "!px-2.5 !py-0.5", children: RESOURCE_CATEGORIES[r.category] ?? r.category })),
    },
    {
        key: 'file',
        title: '文件类型 / 大小',
        width: '150px',
        render: (r) => (_jsxs("span", { className: "mono flex items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(HardDrive, { className: "h-3.5 w-3.5 opacity-60" }), r.fileType || '—', _jsx("span", { className: "text-muted-foreground/60", children: "\u00B7" }), fbytes(r.fileSize)] })),
    },
    {
        key: 'downloads',
        title: '下载次数',
        width: '100px',
        render: (r) => (_jsxs("span", { className: "mono flex items-center gap-1.5 text-xs text-foreground/80", children: [_jsx(Download, { className: "h-3.5 w-3.5 opacity-60" }), fnum(r.downloads)] })),
    },
    {
        key: 'sortOrder',
        title: '排序',
        width: '72px',
        render: (r) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: r.sortOrder ?? 0 }),
    },
    {
        key: 'createdAt',
        title: '创建时间',
        width: '112px',
        render: (r) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: fdate(r.createdAt) }),
    },
];
/* ---------------------------------------------------------------------------
 * 文件上传控件（任意类型文件，上传后把地址复制到剪贴板，便于粘贴进表单）
 * ------------------------------------------------------------------------- */
function FileUploader() {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [last, setLast] = useState(null);
    const [copied, setCopied] = useState(false);
    const toast = useToast();
    const upload = async (files) => {
        const file = files?.[0];
        if (!file)
            return;
        setUploading(true);
        setCopied(false);
        try {
            const out = await AdminApi.upload([file]);
            const r = out?.[0];
            if (!r?.url)
                throw new Error('上传未返回文件地址');
            setLast(r);
            let tip = `文件地址：${r.url}`;
            try {
                await navigator.clipboard.writeText(r.url);
                setCopied(true);
                tip = `文件地址已复制到剪贴板：${r.url}`;
            }
            catch {
                /* 剪贴板不可用时仅提示地址 */
            }
            toast.success(`已上传 ${r.name}（${fbytes(r.size)}）`, tip);
        }
        catch (e) {
            toast.error('上传失败', e?.message ?? '请稍后重试');
        }
        finally {
            setUploading(false);
            if (inputRef.current)
                inputRef.current.value = '';
        }
    };
    const copy = async () => {
        if (!last?.url)
            return;
        try {
            await navigator.clipboard.writeText(last.url);
            setCopied(true);
            toast.success('已复制文件地址', last.url);
        }
        catch {
            toast.error('复制失败', '请手动选中地址后复制');
        }
    };
    return (_jsxs(Glass, { tone: "soft", className: "p-5", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-2.5", children: [_jsx(Upload, { className: "mt-0.5 h-4 w-4 text-primary" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "\u4E0A\u4F20\u6587\u4EF6" }), _jsx("p", { className: "mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground", children: "\u652F\u6301 PDF / Word / PPT / Excel / ZIP \u7B49\u4EFB\u610F\u6587\u4EF6\uFF0C\u5355\u4E2A\u4E0D\u8D85\u8FC7 30MB\u3002\u4E0A\u4F20\u6210\u529F\u540E\u5730\u5740\u4F1A\u81EA\u52A8\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C \u7C98\u8D34\u5230\u300C\u65B0\u5EFA / \u7F16\u8F91\u8D44\u6E90\u300D\u62BD\u5C49\u7684\u300C\u6587\u4EF6\u5730\u5740\u300D\u5B57\u6BB5\u5373\u53EF\u3002" })] })] }), _jsxs(Button, { variant: "primary", loading: uploading, onClick: () => inputRef.current?.click(), children: [_jsx(Upload, { className: "h-4 w-4" }), uploading ? '上传中…' : '上传文件'] }), _jsx("input", { ref: inputRef, type: "file", hidden: true, onChange: (e) => void upload(e.target.files) })] }), last && (_jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3", children: [_jsx("span", { className: "clamp-1 max-w-[240px] text-xs text-foreground/85", title: last.name, children: last.name }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: [fbytes(last.size), " \u00B7 ", last.size, " \u5B57\u8282"] }), _jsx("span", { className: "mono clamp-1 min-w-0 flex-1 text-[11px] text-primary/90", children: last.url }), _jsxs(Button, { size: "sm", variant: "glass", onClick: copy, children: [copied ? _jsx(Check, { className: "h-3.5 w-3.5" }) : _jsx(Copy, { className: "h-3.5 w-3.5" }), copied ? '已复制' : '复制地址'] })] }))] }));
}
export default function Resources() {
    useTitle('资源中心');
    const reveal = useReveal();
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { ref: reveal, "data-reveal": true, children: _jsx(FileUploader, {}) }), _jsx(ResourceManager, { title: "\u8D44\u6E90\u4E2D\u5FC3", description: "\u7EF4\u62A4\u7533\u62A5\u6A21\u677F\u3001\u653F\u7B56\u6587\u4EF6\u3001\u7ADE\u8D5B\u6307\u5357\u3001\u57F9\u8BAD\u8D44\u6599\u4E0E\u5E38\u89C1\u95EE\u9898\uFF1B\u652F\u6301\u4E0A\u4F20\u6587\u4EF6\u3001\u5916\u90E8\u94FE\u63A5\u4E0E\u6392\u5E8F\u6743\u91CD\u3002", resource: "resources", fields: FIELDS, columns: COLUMNS, pageSize: 12, searchPlaceholder: "\u641C\u7D22\u8D44\u6E90\u6807\u9898\u6216\u8BF4\u660E\u2026", emptyText: "\u6682\u65E0\u8D44\u6E90", createLabel: "\u65B0\u5EFA\u8D44\u6E90", filters: ({ filters, setFilter }) => [
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
                ] })] }));
}
