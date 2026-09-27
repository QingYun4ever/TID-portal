import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Building2, FileText, Mail, QrCode, RefreshCw, Save, Settings as SettingsIcon } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useSettings, useToast } from '@/lib/store';
import { cn, fdatetime } from '@/lib/utils';
import { AdminPage, ImagePicker, RichTextEditor } from '@/components/AdminKit';
import { Button, Chip, EmptyState, ErrorState, Field, Glass, Input, Skeleton, Tabs, Textarea } from '@/components/ui';
/* 表单字段（顺序即渲染顺序） */
const BRAND_FIELDS = [
    { name: 'deptName', label: '部门名称', placeholder: '科技创新部' },
    { name: 'deptNameEn', label: '英文名称', placeholder: 'TECHNOLOGY & INNOVATION DEPT.', hint: '显示在 Logo 锁定组合中' },
    { name: 'slogan', label: '宣传语', placeholder: '以技术为舟，以创新为帆' },
    { name: 'icp', label: '备案号', placeholder: '例如 京ICP备00000000号', hint: '留空则页脚不显示备案信息' },
];
const CONTACT_FIELDS = [
    { name: 'email', label: '联系邮箱', placeholder: 'sti@university.edu.cn' },
    { name: 'phone', label: '联系电话', placeholder: '010-8888 6666' },
    { name: 'address', label: '办公地址', placeholder: '大学生活动中心 3 楼 305 室' },
];
const ALL_KEYS = [...BRAND_FIELDS.map((f) => f.name), ...CONTACT_FIELDS.map((f) => f.name), 'intro', 'wechatQr'];
const PAGE_TABS = [
    { key: 'about', label: '部门简介', hint: '展示在门户「部门概况」页正文区' },
    { key: 'contact', label: '联系方式', hint: '展示在门户「部门概况」页联系方式区' },
    { key: 'join-notice', label: '招新公告', hint: '展示在门户「加入我们」页顶部' },
];
function pickSettings(src) {
    const out = {};
    for (const k of ALL_KEYS)
        out[k] = src?.[k] ?? '';
    return out;
}
/* =============================================================================
 * 站点设置
 * ========================================================================== */
export default function Settings() {
    useTitle('站点设置');
    const toast = useToast();
    const { refresh: refreshGlobalSettings } = useSettings();
    const { data, loading, error, reload } = useApi(() => AdminApi.settings(), []);
    const [form, setForm] = useState(null);
    const [initial, setInitial] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (data && initial === null) {
            const picked = pickSettings(data);
            setForm(picked);
            setInitial(picked);
        }
    }, [data, initial]);
    const dirtyKeys = useMemo(() => (form && initial ? ALL_KEYS.filter((k) => (form[k] ?? '') !== (initial[k] ?? '')) : []), [form, initial]);
    const set = (k, v) => setForm((s) => ({ ...(s ?? {}), [k]: v }));
    const save = async () => {
        if (!form)
            return;
        const payload = {};
        for (const k of dirtyKeys)
            payload[k] = form[k] ?? '';
        if (!Object.keys(payload).length)
            return;
        if (!String(form.deptName ?? '').trim())
            return toast.error('请填写部门名称');
        setSaving(true);
        try {
            await AdminApi.saveSettings(payload);
            setInitial({ ...form });
            toast.success('设置已保存', `已更新 ${Object.keys(payload).length} 项`);
            refreshGlobalSettings();
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setSaving(false);
        }
    };
    /* ------------------------------ 页面内容 ------------------------------ */
    const { data: pages, loading: pagesLoading, error: pagesError, reload: reloadPages } = useApi(() => AdminApi.pages(), []);
    const [tab, setTab] = useState('about');
    const [pageForm, setPageForm] = useState({ title: '', content: '' });
    const [pageSaving, setPageSaving] = useState(false);
    const currentPage = useMemo(() => (pages ?? []).find((p) => p.key === tab) ?? null, [pages, tab]);
    useEffect(() => {
        setPageForm({ title: currentPage?.title ?? '', content: currentPage?.content ?? '' });
    }, [currentPage?.key, currentPage?.title, currentPage?.content]);
    const pageDirty = !!currentPage && (pageForm.title !== (currentPage.title ?? '') || pageForm.content !== (currentPage.content ?? ''));
    const activeTab = PAGE_TABS.find((t) => t.key === tab);
    const savePage = async () => {
        if (!pageForm.title.trim())
            return toast.error('请填写页面标题');
        setPageSaving(true);
        try {
            await AdminApi.savePage(tab, { title: pageForm.title.trim(), content: pageForm.content });
            toast.success('页面已保存', activeTab?.label ?? tab);
            reloadPages();
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setPageSaving(false);
        }
    };
    const settingsReady = !!form && !!initial;
    /* 本页为懒加载路由，内容在设置载入后才渲染 —— 重新扫描滚动揭示 */
    useRevealScan(`${settingsReady ? 'ready' : 'pending'}-${pagesLoading ? 'pl' : 'pd'}-${tab}`);
    return (_jsx(AdminPage, { title: "\u7AD9\u70B9\u8BBE\u7F6E", description: "\u7EF4\u62A4\u95E8\u6237\u7684\u54C1\u724C\u4FE1\u606F\u3001\u90E8\u95E8\u4ECB\u7ECD\u3001\u8054\u7CFB\u65B9\u5F0F\u4E0E\u9875\u9762\u6B63\u6587\uFF0C\u4FDD\u5B58\u540E\u524D\u53F0\u7ACB\u5373\u751F\u6548\u3002", breadcrumb: "\u540E\u53F0\u7BA1\u7406", icon: _jsx(SettingsIcon, { className: "h-6 w-6" }), actions: _jsxs(_Fragment, { children: [dirtyKeys.length > 0 && (_jsxs(Chip, { tone: "warning", children: [_jsx(AlertCircle, { className: "h-3 w-3" }), "\u672A\u4FDD\u5B58\u66F4\u6539 ", dirtyKeys.length, " \u9879"] })), _jsxs(Button, { variant: "glass", onClick: reload, disabled: loading, children: [_jsx(RefreshCw, { className: cn('h-3.5 w-3.5', loading && 'animate-spin') }), "\u91CD\u65B0\u8F7D\u5165"] }), _jsxs(Button, { variant: "primary", onClick: save, loading: saving, disabled: !settingsReady || dirtyKeys.length === 0, children: [_jsx(Save, { className: "h-3.5 w-3.5" }), "\u4FDD\u5B58\u8BBE\u7F6E"] })] }), children: error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : !settingsReady ? (_jsx("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-[280px]" }, i))) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", "data-reveal": true, children: [_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Building2, { className: "h-4 w-4 text-primary" }), "\u54C1\u724C\u4FE1\u606F"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u51FA\u73B0\u5728\u9876\u680F Logo\u3001\u9875\u811A\u4E0E\u5206\u4EAB\u5361\u7247\u4E2D" }), _jsx("div", { className: "mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2", children: BRAND_FIELDS.map((f) => (_jsx("div", { className: f.name === 'deptNameEn' ? 'sm:col-span-2' : '', children: _jsx(Field, { label: f.label, hint: f.hint, children: _jsx(Input, { value: form[f.name] ?? '', placeholder: f.placeholder, onChange: (e) => set(f.name, e.target.value) }) }) }, f.name))) })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Mail, { className: "h-4 w-4 text-primary" }), "\u8054\u7CFB\u65B9\u5F0F"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u663E\u793A\u5728\u9875\u811A\u4E0E\u300C\u90E8\u95E8\u6982\u51B5\u300D\u9875\u9762" }), _jsx("div", { className: "mt-5 grid grid-cols-1 gap-5", children: CONTACT_FIELDS.map((f) => (_jsx(Field, { label: f.label, hint: f.hint, children: _jsx(Input, { value: form[f.name] ?? '', placeholder: f.placeholder, onChange: (e) => set(f.name, e.target.value) }) }, f.name))) })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(FileText, { className: "h-4 w-4 text-primary" }), "\u90E8\u95E8\u4ECB\u7ECD"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u7EAF\u6587\u672C\uFF0C\u4F1A\u663E\u793A\u5728\u9996\u9875\u300C\u5173\u4E8E\u6211\u4EEC\u300D\u533A\u5757\u4E0E\u90E8\u95E8\u6982\u51B5\u9875" }), _jsx("div", { className: "mt-5", children: _jsx(Field, { label: "\u7B80\u4ECB\u6B63\u6587", hint: `${(form.intro ?? '').length} 字`, children: _jsx(Textarea, { rows: 9, value: form.intro ?? '', placeholder: "\u7528\u4E00\u6BB5\u8BDD\u4ECB\u7ECD\u90E8\u95E8\u7684\u804C\u8D23\u3001\u5B9A\u4F4D\u4E0E\u5DE5\u4F5C\u8303\u56F4\u2026", onChange: (e) => set('intro', e.target.value) }) }) })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(QrCode, { className: "h-4 w-4 text-primary" }), "\u5FAE\u4FE1\u516C\u4F17\u53F7\u4E8C\u7EF4\u7801"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u4E0A\u4F20\u540E\u663E\u793A\u5728\u9875\u811A\u4E0E\u300C\u52A0\u5165\u6211\u4EEC\u300D\u9875\u9762\uFF0C\u5EFA\u8BAE\u4F7F\u7528\u6B63\u65B9\u5F62\u56FE\u7247" }), _jsx("div", { className: "mt-5 max-w-[280px]", children: _jsx(ImagePicker, { value: form.wechatQr ?? '', onChange: (url) => set('wechatQr', url), label: "\u4E0A\u4F20\u4E8C\u7EF4\u7801", aspect: "aspect-square" }) })] })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(BookOpen, { className: "h-4 w-4 text-primary" }), "\u9875\u9762\u5185\u5BB9"] }), _jsxs("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: ["\u5BCC\u6587\u672C\u6B63\u6587\uFF0C\u652F\u6301\u6807\u9898\u3001\u5217\u8868\u3001\u5F15\u7528\u3001\u94FE\u63A5\u4E0E\u56FE\u7247\uFF1B", activeTab?.hint] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2.5", children: [pageDirty && (_jsxs(Chip, { tone: "warning", children: [_jsx(AlertCircle, { className: "h-3 w-3" }), "\u672A\u4FDD\u5B58"] })), _jsxs(Button, { variant: "primary", onClick: savePage, loading: pageSaving, disabled: pagesLoading || !currentPage || !pageDirty, children: [_jsx(Save, { className: "h-3.5 w-3.5" }), "\u4FDD\u5B58\u9875\u9762"] })] })] }), _jsx("div", { className: "mt-5", children: _jsx(Tabs, { items: PAGE_TABS.map((t) => ({ value: t.key, label: t.label })), value: tab, onChange: setTab }) }), pagesError ? (_jsx(ErrorState, { message: pagesError, onRetry: reloadPages })) : pagesLoading ? (_jsx(Skeleton, { className: "mt-5 h-[320px]" })) : !currentPage ? (_jsx(EmptyState, { icon: _jsx(BookOpen, { className: "h-5 w-5" }), title: "\u8BE5\u9875\u9762\u8FD8\u6CA1\u6709\u5185\u5BB9", description: "\u4FDD\u5B58\u540E\u4F1A\u81EA\u52A8\u521B\u5EFA\u9875\u9762\u8BB0\u5F55\u3002" })) : (_jsxs("div", { className: "mt-5 flex flex-col gap-5", children: [_jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u9875\u9762\u6807\u9898", required: true, children: _jsx(Input, { value: pageForm.title, onChange: (e) => setPageForm((s) => ({ ...s, title: e.target.value })) }) }), _jsx(Field, { label: "\u6700\u540E\u66F4\u65B0", hint: `key = ${currentPage.key}`, children: _jsx("div", { className: "field mono flex items-center bg-white/[0.02] text-muted-foreground", children: fdatetime(currentPage.updatedAt) }) })] }), _jsx(Field, { label: "\u6B63\u6587\u5185\u5BB9", hint: "\u652F\u6301\u53EF\u89C6\u5316\u7F16\u8F91\u4E0E HTML \u6E90\u7801\u4E24\u79CD\u6A21\u5F0F", children: _jsx(RichTextEditor, { value: pageForm.content, onChange: (html) => setPageForm((s) => ({ ...s, content: html })), placeholder: "\u5728\u6B64\u64B0\u5199\u9875\u9762\u6B63\u6587\u2026", minHeight: 320 }) })] }))] })] })) }));
}
