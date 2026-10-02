import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Megaphone, Pencil, RefreshCw, ShieldCheck, Trash2, Users as UsersIcon } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useDebounced, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, ROLES } from '@/lib/utils';
import { AdminPage, DataTable, FilterBar, RowBtn, type Column } from '@/components/AdminKit';
import {
  Avatar,
  Button,
  Chip,
  ConfirmDialog,
  Drawer,
  ErrorState,
  Field,
  Glass,
  Input,
  Modal,
  Select,
  Switch,
  Tabs,
  Textarea,
} from '@/components/ui';

interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  studentId?: string | null;
  college?: string | null;
  isActive: boolean;
  createdAt?: string;
}

const ROLE_TONE: Record<string, 'default' | 'primary' | 'accent' | 'success'> = {
  superadmin: 'accent',
  admin: 'primary',
  member: 'success',
  student: 'default',
};

const ROLE_ORDER = ['superadmin', 'admin', 'member', 'student'];

/* =============================================================================
 * 用户与权限
 * ========================================================================== */
export default function Users() {
  useTitle('用户与权限');
  const toast = useToast();
  const { isSuperAdmin, user: me } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const { data, meta, loading, error, reload } = useApi<any>(
    () => AdminApi.users({ page, pageSize, role, q }),
    [page, pageSize, role, q]
  );

  const rows: AdminUser[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const counts: Record<string, number> = meta?.counts ?? {};

  useEffect(() => {
    setPage(1);
  }, [role, q]);

  /* ------------------------------ 编辑用户 ------------------------------ */
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditForm({
      name: u.name ?? '',
      role: u.role ?? 'student',
      email: u.email ?? '',
      phone: u.phone ?? '',
      college: u.college ?? '',
      studentId: u.studentId ?? '',
      isActive: !!u.isActive,
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    if (!String(editForm.name ?? '').trim()) return toast.error('请填写姓名');
    setSaving(true);
    try {
      await AdminApi.updateUser(editing.id, {
        name: String(editForm.name).trim(),
        role: editForm.role,
        email: editForm.email,
        phone: editForm.phone,
        college: editForm.college,
        studentId: editForm.studentId,
        isActive: !!editForm.isActive,
      });
      toast.success('已保存修改', editing.name);
      setEditing(null);
      reload();
    } catch (e: any) {
      toast.error('保存失败', e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ 删除用户 ------------------------------ */
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmRemove = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      await AdminApi.deleteUser(removing.id);
      toast.success('已删除用户', removing.name);
      setRemoving(null);
      reload();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ------------------------------ 启用 / 停用 ------------------------------ */
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const toggleActive = async (u: AdminUser, v: boolean) => {
    if (!isSuperAdmin) {
      toast.error('权限不足', '仅超级管理员可以启用或停用账号');
      return;
    }
    setTogglingId(u.id);
    try {
      await AdminApi.updateUser(u.id, { isActive: v });
      toast.success(v ? '已启用账号' : '已停用账号', u.name);
      reload();
    } catch (e: any) {
      toast.error('操作失败', e.message);
    } finally {
      setTogglingId(null);
    }
  };

  /* ------------------------------ 群发站内消息 ------------------------------ */
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [bc, setBc] = useState({ role: 'all', title: '', content: '', link: '' });

  const openBroadcast = () => {
    setBc({ role: 'all', title: '', content: '', link: '' });
    setBroadcastOpen(true);
  };

  const submitBroadcast = async () => {
    if (!bc.title.trim()) return toast.error('请填写消息标题');
    if (!bc.content.trim()) return toast.error('请填写消息内容');
    setSending(true);
    try {
      const res: any = await AdminApi.broadcast({
        role: bc.role,
        title: bc.title.trim(),
        content: bc.content.trim(),
        link: bc.link.trim() || undefined,
      });
      toast.success('群发成功', `已发送给 ${res?.sent ?? 0} 位用户`);
      setBroadcastOpen(false);
    } catch (e: any) {
      toast.error('发送失败', e.message);
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------ 表格列 ------------------------------ */
  const columns: Column<AdminUser>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'ID',
        width: '64px',
        render: (u) => <span className="mono text-xs text-muted-foreground">#{u.id}</span>,
      },
      {
        key: 'name',
        title: '姓名',
        width: '190px',
        render: (u) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={u.name} src={u.avatar} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground/90">{u.name}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">
                {u.id === me?.id ? '当前账号' : ROLES[u.role] ?? u.role}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'username',
        title: '账号',
        width: '120px',
        render: (u) => <span className="mono text-xs text-foreground/80">{u.username}</span>,
      },
      {
        key: 'role',
        title: '角色',
        width: '110px',
        render: (u) => (
          <Chip tone={ROLE_TONE[u.role] ?? 'default'} className="!px-2.5 !py-0.5">
            {ROLES[u.role] ?? u.role}
          </Chip>
        ),
      },
      {
        key: 'college',
        title: '班级',
        width: '150px',
        render: (u) => <span className="text-xs text-muted-foreground">{u.college || '—'}</span>,
      },
      {
        key: 'studentId',
        title: '学号',
        width: '120px',
        render: (u) => <span className="mono text-xs text-muted-foreground">{u.studentId || '—'}</span>,
      },
      {
        key: 'email',
        title: '邮箱',
        width: '190px',
        render: (u) => <span className="text-xs text-muted-foreground">{u.email || '—'}</span>,
      },
      {
        key: 'phone',
        title: '手机',
        width: '130px',
        render: (u) => <span className="mono text-xs text-muted-foreground">{u.phone || '—'}</span>,
      },
      {
        key: 'isActive',
        title: '状态',
        width: '130px',
        render: (u) => (
          <div className="flex items-center gap-2" title={isSuperAdmin ? undefined : '仅超级管理员可以操作'}>
            <Switch checked={!!u.isActive} onChange={(v) => void toggleActive(u, v)} />
            <span className={cn('text-[11px]', u.isActive ? 'text-[hsl(var(--success))]' : 'text-muted-foreground')}>
              {togglingId === u.id ? '处理中…' : u.isActive ? '启用' : '停用'}
            </span>
          </div>
        ),
      },
      {
        key: 'createdAt',
        title: '注册时间',
        width: '150px',
        render: (u) => <span className="mono text-[11px] text-muted-foreground">{fdatetime(u.createdAt)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, me?.id, togglingId]
  );

  const tabItems = useMemo(
    () => [
      { value: 'all', label: '全部', count: Object.values(counts).reduce((s, n) => s + n, 0) || total },
      ...ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r], count: counts[r] ?? 0 })),
    ],
    [counts, total]
  );

  return (
    <AdminPage
      title="用户与权限"
      description="管理通过统一身份认证登录的用户、角色与启用状态，并向指定角色的用户群发站内消息。"
      breadcrumb="后台管理"
      icon={<ShieldCheck className="h-6 w-6" />}
      actions={
        <>
          <Button variant="glass" onClick={reload} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button variant="glass" onClick={openBroadcast}>
            <Megaphone className="h-3.5 w-3.5" />
            群发消息
          </Button>
        </>
      }
    >
      {!isSuperAdmin && (
        <Glass tone="soft" className="flex items-start gap-3 border border-[hsl(var(--warning))]/25 p-4" data-reveal>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <div className="text-[12.5px] leading-relaxed">
            <p className="font-medium text-[hsl(var(--warning))]">权限受限（只读）</p>
            <p className="mt-1 text-muted-foreground">
              当前账号为「{ROLES[me?.role ?? ''] ?? me?.role}」。只有超级管理员可以编辑用户、修改角色、启用停用与删除账号；你仍可以查看列表并群发站内消息。
            </p>
          </div>
        </Glass>
      )}

      <div className="flex flex-col gap-3.5" data-reveal>
        <Tabs items={tabItems} value={role} onChange={setRole} />
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="搜索账号 / 姓名 / 邮箱…"
          extra={
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              共 <span className="mono text-foreground/85">{total}</span> 位用户
            </div>
          }
        />
      </div>

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : (
        <DataTable<AdminUser>
          columns={columns}
          rows={rows}
          loading={loading && !data}
          empty={search || role !== 'all' ? '没有符合条件的用户' : '暂无用户'}
          emptyDescription={
            search || role !== 'all' ? '试试更换角色筛选或清空搜索关键词。' : '点击右上角「新建用户」添加第一位用户。'
          }
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          rowActions={(u) => (
            <>
              <RowBtn
                icon={Pencil}
                label={isSuperAdmin ? '编辑用户' : '仅超级管理员可编辑'}
                tone="primary"
                onClick={() => (isSuperAdmin ? openEdit(u) : toast.error('权限不足', '仅超级管理员可以编辑用户'))}
              />
              <RowBtn
                icon={Trash2}
                label={isSuperAdmin ? '删除用户' : '仅超级管理员可删除'}
                tone="danger"
                onClick={() => (isSuperAdmin ? setRemoving(u) : toast.error('权限不足', '仅超级管理员可以删除用户'))}
              />
            </>
          )}
        />
      )}

      {/* ------------------------------ 编辑用户 ------------------------------ */}
      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `编辑用户 · ${editing.name}` : '编辑用户'}
        width="max-w-xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="mono">#{editing?.id}</span> · {editing?.username}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                取消
              </Button>
              <Button variant="primary" onClick={submitEdit} loading={saving} disabled={!isSuperAdmin}>
                保存
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
            <Avatar name={editing?.name ?? ''} src={editing?.avatar} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{editing?.name}</p>
              <p className="mono truncate text-[11px] text-muted-foreground">
                {editing?.username} · 注册于 {fdatetime(editing?.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="姓名" required>
              <Input value={editForm.name ?? ''} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="角色" hint={isSuperAdmin ? '超级管理员拥有全部权限' : '仅超级管理员可修改角色'}>
              <Select
                value={editForm.role ?? 'student'}
                disabled={!isSuperAdmin}
                onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="邮箱">
              <Input value={editForm.email ?? ''} onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="手机">
              <Input value={editForm.phone ?? ''} onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))} />
            </Field>
            <Field label="班级">
              <Input value={editForm.college ?? ''} onChange={(e) => setEditForm((s) => ({ ...s, college: e.target.value }))} />
            </Field>
            <Field label="学号">
              <Input value={editForm.studentId ?? ''} onChange={(e) => setEditForm((s) => ({ ...s, studentId: e.target.value }))} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="账号状态" hint="停用后该账号无法登录，历史数据保留">
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                  <Switch
                    checked={!!editForm.isActive}
                    onChange={(v) =>
                      isSuperAdmin
                        ? setEditForm((s) => ({ ...s, isActive: v }))
                        : toast.error('权限不足', '仅超级管理员可修改账号状态')
                    }
                  />
                  <span className="text-[12.5px] text-muted-foreground">{editForm.isActive ? '启用中' : '已停用'}</span>
                </div>
              </Field>
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/[0.06] p-3.5 text-[11.5px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
              你没有修改用户信息的权限，保存按钮已禁用。
            </div>
          )}
        </div>
      </Drawer>

      {/* ------------------------------ 删除确认 ------------------------------ */}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={deleting}
        title="删除用户"
        confirmText="确认删除"
        description={
          <>
            确定要删除用户「{removing?.name}」吗？该账号将立即失效，此操作不可撤销。
            <span className="mono mt-2 block text-[11px] text-muted-foreground">
              #{removing?.id} · {removing?.username} · {ROLES[removing?.role ?? ''] ?? removing?.role}
            </span>
          </>
        }
      />

      {/* ------------------------------ 群发消息 ------------------------------ */}
      <Modal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title="群发站内消息"
        description="消息会发送到用户中心的「我的消息」，仅发送给启用中的账号。"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBroadcastOpen(false)} disabled={sending}>
              取消
            </Button>
            <Button variant="primary" onClick={submitBroadcast} loading={sending}>
              <Megaphone className="h-3.5 w-3.5" />
              立即发送
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="接收角色" required hint="选择「全部用户」将发送给所有启用中的账号">
            <Select value={bc.role} onChange={(e) => setBc((s) => ({ ...s, role: e.target.value }))}>
              <option value="all">全部用户</option>
              <option value="superadmin">超级管理员</option>
              <option value="admin">管理员</option>
              <option value="member">部门成员</option>
              <option value="student">学生</option>
            </Select>
          </Field>
          <Field label="跳转链接" hint="可选，例如 /activities 或 /account/messages">
            <Input value={bc.link} onChange={(e) => setBc((s) => ({ ...s, link: e.target.value }))} placeholder="/activities" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="消息标题" required>
              <Input
                value={bc.title}
                onChange={(e) => setBc((s) => ({ ...s, title: e.target.value }))}
                placeholder="例如：科技创新部 2026 年 11 月招新面试通知"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="消息内容" required hint={`${bc.content.length} / 2000`}>
              <Textarea
                rows={6}
                maxLength={2000}
                value={bc.content}
                onChange={(e) => setBc((s) => ({ ...s, content: e.target.value }))}
                placeholder="请填写消息正文，支持纯文本换行。"
              />
            </Field>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}
