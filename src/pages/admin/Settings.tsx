import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Building2, FileText, Mail, QrCode, RefreshCw, Save, Settings as SettingsIcon } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useSettings, useToast } from '@/lib/store';
import { cn, fdatetime } from '@/lib/utils';
import { AdminPage, ImagePicker, RichTextEditor } from '@/components/AdminKit';
import { Button, Chip, EmptyState, ErrorState, Field, Glass, Input, Skeleton, Tabs, Textarea } from '@/components/ui';

/* 表单字段（顺序即渲染顺序） */
const BRAND_FIELDS: { name: string; label: string; placeholder?: string; hint?: string }[] = [
  { name: 'deptName', label: '部门名称', placeholder: '科技创新部' },
  { name: 'deptNameEn', label: '英文名称', placeholder: 'TECHNOLOGY & INNOVATION DEPT.', hint: '显示在 Logo 锁定组合中' },
  { name: 'slogan', label: '宣传语', placeholder: '以技术为舟，以创新为帆' },
  { name: 'foundedAt', label: '成立时间', placeholder: '2026-01', hint: '用于部门概况「服务年数」统计' },
  { name: 'icp', label: '备案号', placeholder: '例如 京ICP备00000000号', hint: '留空则页脚不显示备案信息' },
];

const CONTACT_FIELDS: { name: string; label: string; placeholder?: string; hint?: string }[] = [
  { name: 'email', label: '联系邮箱', placeholder: 'notpaperxiang@gmail.com' },
  { name: 'address', label: '办公地址', placeholder: '北京市陈经纶中学本部高中' },
];

const ALL_KEYS = [...BRAND_FIELDS.map((f) => f.name), ...CONTACT_FIELDS.map((f) => f.name), 'intro', 'wechatQr'];

const PAGE_TABS = [
  { key: 'about', label: '部门简介', hint: '展示在门户「部门概况」页正文区' },
  { key: 'contact', label: '联系方式', hint: '展示在门户「部门概况」页联系方式区' },
  { key: 'join-notice', label: '招新公告', hint: '展示在门户「加入我们」页顶部' },
];

function pickSettings(src: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ALL_KEYS) out[k] = src?.[k] ?? '';
  return out;
}

/* =============================================================================
 * 站点设置
 * ========================================================================== */
export default function Settings() {
  useTitle('站点设置');
  const toast = useToast();
  const { refresh: refreshGlobalSettings } = useSettings();

  const { data, loading, error, reload } = useApi<Record<string, string>>(() => AdminApi.settings(), []);

  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [initial, setInitial] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && initial === null) {
      const picked = pickSettings(data);
      setForm(picked);
      setInitial(picked);
    }
  }, [data, initial]);

  const dirtyKeys = useMemo(
    () => (form && initial ? ALL_KEYS.filter((k) => (form[k] ?? '') !== (initial[k] ?? '')) : []),
    [form, initial]
  );

  const set = (k: string, v: string) => setForm((s) => ({ ...(s ?? {}), [k]: v }));

  const save = async () => {
    if (!form) return;
    const payload: Record<string, string> = {};
    for (const k of dirtyKeys) payload[k] = form[k] ?? '';
    if (!Object.keys(payload).length) return;
    if (!String(form.deptName ?? '').trim()) return toast.error('请填写部门名称');
    setSaving(true);
    try {
      await AdminApi.saveSettings(payload);
      setInitial({ ...form });
      toast.success('设置已保存', `已更新 ${Object.keys(payload).length} 项`);
      refreshGlobalSettings();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ 页面内容 ------------------------------ */
  const { data: pages, loading: pagesLoading, error: pagesError, reload: reloadPages } = useApi<any[]>(() => AdminApi.pages(), []);
  const [tab, setTab] = useState('about');
  const [pageForm, setPageForm] = useState({ title: '', content: '' });
  const [pageSaving, setPageSaving] = useState(false);

  const currentPage = useMemo(() => (pages ?? []).find((p) => p.key === tab) ?? null, [pages, tab]);

  useEffect(() => {
    setPageForm({ title: currentPage?.title ?? '', content: currentPage?.content ?? '' });
  }, [currentPage?.key, currentPage?.title, currentPage?.content]);

  const pageDirty =
    !!currentPage && (pageForm.title !== (currentPage.title ?? '') || pageForm.content !== (currentPage.content ?? ''));
  const activeTab = PAGE_TABS.find((t) => t.key === tab);

  const savePage = async () => {
    if (!pageForm.title.trim()) return toast.error('请填写页面标题');
    setPageSaving(true);
    try {
      await AdminApi.savePage(tab, { title: pageForm.title.trim(), content: pageForm.content });
      toast.success('页面已保存', activeTab?.label ?? tab);
      reloadPages();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setPageSaving(false);
    }
  };

  const settingsReady = !!form && !!initial;
  /* 本页为懒加载路由，内容在设置载入后才渲染 —— 重新扫描滚动揭示 */
  useRevealScan(`${settingsReady ? 'ready' : 'pending'}-${pagesLoading ? 'pl' : 'pd'}-${tab}`);

  return (
    <AdminPage
      title="站点设置"
      description="维护门户的品牌信息、部门介绍、联系方式与页面正文，保存后前台立即生效。"
      breadcrumb="后台管理"
      icon={<SettingsIcon className="h-6 w-6" />}
      actions={
        <>
          {dirtyKeys.length > 0 && (
            <Chip tone="warning">
              <AlertCircle className="h-3 w-3" />
              未保存更改 {dirtyKeys.length} 项
            </Chip>
          )}
          <Button variant="glass" onClick={reload} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            重新载入
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!settingsReady || dirtyKeys.length === 0}>
            <Save className="h-3.5 w-3.5" />
            保存设置
          </Button>
        </>
      }
    >
      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : !settingsReady ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-reveal>
            {/* ---------------- 品牌信息 ---------------- */}
            <Glass tone="soft" className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                品牌信息
              </h2>
              <p className="mt-1 text-[11.5px] text-muted-foreground">出现在顶栏 Logo、页脚与分享卡片中</p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {BRAND_FIELDS.map((f) => (
                  <div key={f.name} className={f.name === 'deptNameEn' ? 'sm:col-span-2' : ''}>
                    <Field label={f.label} hint={f.hint}>
                      <Input value={form[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                    </Field>
                  </div>
                ))}
              </div>
            </Glass>

            {/* ---------------- 联系方式 ---------------- */}
            <Glass tone="soft" className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" />
                联系方式
              </h2>
              <p className="mt-1 text-[11.5px] text-muted-foreground">显示在页脚与「部门概况」页面</p>
              <div className="mt-5 grid grid-cols-1 gap-5">
                {CONTACT_FIELDS.map((f) => (
                  <Field key={f.name} label={f.label} hint={f.hint}>
                    <Input value={form[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                  </Field>
                ))}
              </div>
            </Glass>

            {/* ---------------- 部门介绍 ---------------- */}
            <Glass tone="soft" className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                部门介绍
              </h2>
              <p className="mt-1 text-[11.5px] text-muted-foreground">纯文本，会显示在首页「关于我们」区块与部门概况页</p>
              <div className="mt-5">
                <Field label="简介正文" hint={`${(form.intro ?? '').length} 字`}>
                  <Textarea
                    rows={9}
                    value={form.intro ?? ''}
                    placeholder="用一段话介绍部门的职责、定位与工作范围…"
                    onChange={(e) => set('intro', e.target.value)}
                  />
                </Field>
              </div>
            </Glass>

            {/* ---------------- 微信公众号二维码 ---------------- */}
            <Glass tone="soft" className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <QrCode className="h-4 w-4 text-primary" />
                微信公众号二维码
              </h2>
              <p className="mt-1 text-[11.5px] text-muted-foreground">上传后显示在页脚与「加入我们」页面，建议使用正方形图片</p>
              <div className="mt-5 max-w-[280px]">
                <ImagePicker
                  value={form.wechatQr ?? ''}
                  onChange={(url) => set('wechatQr', url)}
                  label="上传二维码"
                  aspect="aspect-square"
                />
              </div>
            </Glass>
          </div>

          {/* ---------------- 页面内容 ---------------- */}
          <Glass tone="soft" className="p-5 sm:p-6" data-reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpen className="h-4 w-4 text-primary" />
                  页面内容
                </h2>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  富文本正文，支持标题、列表、引用、链接与图片；{activeTab?.hint}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {pageDirty && (
                  <Chip tone="warning">
                    <AlertCircle className="h-3 w-3" />
                    未保存
                  </Chip>
                )}
                <Button variant="primary" onClick={savePage} loading={pageSaving} disabled={pagesLoading || !currentPage || !pageDirty}>
                  <Save className="h-3.5 w-3.5" />
                  保存页面
                </Button>
              </div>
            </div>

            <div className="mt-5">
              <Tabs items={PAGE_TABS.map((t) => ({ value: t.key, label: t.label }))} value={tab} onChange={setTab} />
            </div>

            {pagesError ? (
              <ErrorState message={pagesError} onRetry={reloadPages} />
            ) : pagesLoading ? (
              <Skeleton className="mt-5 h-[320px]" />
            ) : !currentPage ? (
              <EmptyState
                icon={<BookOpen className="h-5 w-5" />}
                title="该页面还没有内容"
                description="保存后会自动创建页面记录。"
              />
            ) : (
              <div className="mt-5 flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="页面标题" required>
                    <Input value={pageForm.title} onChange={(e) => setPageForm((s) => ({ ...s, title: e.target.value }))} />
                  </Field>
                  <Field label="最后更新" hint={`key = ${currentPage.key}`}>
                    <div className="field mono flex items-center bg-white/[0.02] text-muted-foreground">
                      {fdatetime(currentPage.updatedAt)}
                    </div>
                  </Field>
                </div>
                <Field label="正文内容" hint="支持可视化编辑与 HTML 源码两种模式">
                  <RichTextEditor
                    value={pageForm.content}
                    onChange={(html) => setPageForm((s) => ({ ...s, content: html }))}
                    placeholder="在此撰写页面正文…"
                    minHeight={320}
                  />
                </Field>
              </div>
            )}
          </Glass>
        </>
      )}
    </AdminPage>
  );
}
