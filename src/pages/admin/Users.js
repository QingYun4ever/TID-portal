import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Megaphone, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Users as UsersIcon } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useDebounced, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, ROLES } from '@/lib/utils';
import { AdminPage, DataTable, FilterBar, RowBtn } from '@/components/AdminKit';
import { Avatar, Button, Chip, ConfirmDialog, Drawer, ErrorState, Field, Glass, Input, Modal, Select, Switch, Tabs, Textarea, } from '@/components/ui';
const ROLE_TONE = {
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
    const { data, meta, loading, error, reload } = useApi(() => AdminApi.users({ page, pageSize, role, q }), [page, pageSize, role, q]);
    const rows = data?.items ?? [];
    const total = data?.total ?? 0;
    const counts = meta?.counts ?? {};
    useEffect(() => {
        setPage(1);
    }, [role, q]);
    /* ------------------------------ 新建用户 ------------------------------ */
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ username: '', name: '', password: '', role: 'student', email: '', college: '' });
    const openCreate = () => {
        setForm({ username: '', name: '', password: '', role: 'student', email: '', college: '' });
        setCreateOpen(true);
    };
    const submitCreate = async () => {
        if (!form.username.trim())
            return toast.error('请填写账号');
        if (!form.name.trim())
            return toast.error('请填写姓名');
        setCreating(true);
        try {
            await AdminApi.createUser({
                username: form.username.trim(),
                name: form.name.trim(),
                password: form.password.trim() || 'sti123456',
                role: form.role,
                email: form.email.trim(),
                college: form.college.trim(),
            });
            toast.success('用户创建成功', `${form.name}（${ROLES[form.role] ?? form.role}）`);
            setCreateOpen(false);
            reload();
        }
        catch (e) {
            toast.error('创建失败', e.message);
        }
        finally {
            setCreating(false);
        }
    };
    /* ------------------------------ 编辑用户 ------------------------------ */
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const openEdit = (u) => {
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
        if (!editing)
            return;
        if (!String(editForm.name ?? '').trim())
            return toast.error('请填写姓名');
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
        }
        catch (e) {
            toast.error('保存失败', e.message);
        }
        finally {
            setSaving(false);
        }
    };
    /* ------------------------------ 删除用户 ------------------------------ */
    const [removing, setRemoving] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const confirmRemove = async () => {
        if (!removing)
            return;
        setDeleting(true);
        try {
            await AdminApi.deleteUser(removing.id);
            toast.success('已删除用户', removing.name);
            setRemoving(null);
            reload();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setDeleting(false);
        }
    };
    /* ------------------------------ 启用 / 停用 ------------------------------ */
    const [togglingId, setTogglingId] = useState(null);
    const toggleActive = async (u, v) => {
        if (!isSuperAdmin) {
            toast.error('权限不足', '仅超级管理员可以启用或停用账号');
            return;
        }
        setTogglingId(u.id);
        try {
            await AdminApi.updateUser(u.id, { isActive: v });
            toast.success(v ? '已启用账号' : '已停用账号', u.name);
            reload();
        }
        catch (e) {
            toast.error('操作失败', e.message);
        }
        finally {
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
        if (!bc.title.trim())
            return toast.error('请填写消息标题');
        if (!bc.content.trim())
            return toast.error('请填写消息内容');
        setSending(true);
        try {
            const res = await AdminApi.broadcast({
                role: bc.role,
                title: bc.title.trim(),
                content: bc.content.trim(),
                link: bc.link.trim() || undefined,
            });
            toast.success('群发成功', `已发送给 ${res?.sent ?? 0} 位用户`);
            setBroadcastOpen(false);
        }
        catch (e) {
            toast.error('发送失败', e.message);
        }
        finally {
            setSending(false);
        }
    };
    /* ------------------------------ 表格列 ------------------------------ */
    const columns = useMemo(() => [
        {
            key: 'id',
            title: 'ID',
            width: '64px',
            render: (u) => _jsxs("span", { className: "mono text-xs text-muted-foreground", children: ["#", u.id] }),
        },
        {
            key: 'name',
            title: '姓名',
            width: '190px',
            render: (u) => (_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Avatar, { name: u.name, src: u.avatar, size: 32 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-medium text-foreground/90", children: u.name }), _jsx("p", { className: "truncate text-[10.5px] text-muted-foreground", children: u.id === me?.id ? '当前账号' : ROLES[u.role] ?? u.role })] })] })),
        },
        {
            key: 'username',
            title: '账号',
            width: '120px',
            render: (u) => _jsx("span", { className: "mono text-xs text-foreground/80", children: u.username }),
        },
        {
            key: 'role',
            title: '角色',
            width: '110px',
            render: (u) => (_jsx(Chip, { tone: ROLE_TONE[u.role] ?? 'default', className: "!px-2.5 !py-0.5", children: ROLES[u.role] ?? u.role })),
        },
        {
            key: 'college',
            title: '学院',
            width: '150px',
            render: (u) => _jsx("span", { className: "text-xs text-muted-foreground", children: u.college || '—' }),
        },
        {
            key: 'studentId',
            title: '学号',
            width: '120px',
            render: (u) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: u.studentId || '—' }),
        },
        {
            key: 'email',
            title: '邮箱',
            width: '190px',
            render: (u) => _jsx("span", { className: "text-xs text-muted-foreground", children: u.email || '—' }),
        },
        {
            key: 'phone',
            title: '手机',
            width: '130px',
            render: (u) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: u.phone || '—' }),
        },
        {
            key: 'isActive',
            title: '状态',
            width: '130px',
            render: (u) => (_jsxs("div", { className: "flex items-center gap-2", title: isSuperAdmin ? undefined : '仅超级管理员可以操作', children: [_jsx(Switch, { checked: !!u.isActive, onChange: (v) => void toggleActive(u, v) }), _jsx("span", { className: cn('text-[11px]', u.isActive ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'), children: togglingId === u.id ? '处理中…' : u.isActive ? '启用' : '停用' })] })),
        },
        {
            key: 'createdAt',
            title: '注册时间',
            width: '150px',
            render: (u) => _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: fdatetime(u.createdAt) }),
        },
    ], 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, me?.id, togglingId]);
    const tabItems = useMemo(() => [
        { value: 'all', label: '全部', count: Object.values(counts).reduce((s, n) => s + n, 0) || total },
        ...ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r], count: counts[r] ?? 0 })),
    ], [counts, total]);
    return (_jsxs(AdminPage, { title: "\u7528\u6237\u4E0E\u6743\u9650", description: "\u7BA1\u7406\u95E8\u6237\u8D26\u53F7\u3001\u89D2\u8272\u4E0E\u542F\u7528\u72B6\u6001\uFF0C\u5E76\u5411\u6307\u5B9A\u89D2\u8272\u7684\u7528\u6237\u7FA4\u53D1\u7AD9\u5185\u6D88\u606F\u3002", breadcrumb: "\u540E\u53F0\u7BA1\u7406", icon: _jsx(ShieldCheck, { className: "h-6 w-6" }), actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "glass", onClick: reload, disabled: loading, children: [_jsx(RefreshCw, { className: cn('h-3.5 w-3.5', loading && 'animate-spin') }), "\u5237\u65B0"] }), _jsxs(Button, { variant: "glass", onClick: openBroadcast, children: [_jsx(Megaphone, { className: "h-3.5 w-3.5" }), "\u7FA4\u53D1\u6D88\u606F"] }), _jsxs(Button, { variant: "primary", onClick: isSuperAdmin ? openCreate : () => toast.error('权限不足', '仅超级管理员可以新建用户'), children: [_jsx(Plus, { className: "h-4 w-4" }), "\u65B0\u5EFA\u7528\u6237"] })] }), children: [!isSuperAdmin && (_jsxs(Glass, { tone: "soft", className: "flex items-start gap-3 border border-[hsl(var(--warning))]/25 p-4", "data-reveal": true, children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" }), _jsxs("div", { className: "text-[12.5px] leading-relaxed", children: [_jsx("p", { className: "font-medium text-[hsl(var(--warning))]", children: "\u6743\u9650\u53D7\u9650\uFF08\u53EA\u8BFB\uFF09" }), _jsxs("p", { className: "mt-1 text-muted-foreground", children: ["\u5F53\u524D\u8D26\u53F7\u4E3A\u300C", ROLES[me?.role ?? ''] ?? me?.role, "\u300D\u3002\u53EA\u6709\u8D85\u7EA7\u7BA1\u7406\u5458\u53EF\u4EE5\u65B0\u5EFA / \u7F16\u8F91\u7528\u6237\u3001\u4FEE\u6539\u89D2\u8272\u3001\u542F\u7528\u505C\u7528\u4E0E\u5220\u9664\u8D26\u53F7\uFF1B\u4F60\u4ECD\u53EF\u4EE5\u67E5\u770B\u5217\u8868\u5E76\u7FA4\u53D1\u7AD9\u5185\u6D88\u606F\u3002"] })] })] })), _jsxs("div", { className: "flex flex-col gap-3.5", "data-reveal": true, children: [_jsx(Tabs, { items: tabItems, value: role, onChange: setRole }), _jsx(FilterBar, { search: search, onSearch: setSearch, placeholder: "\u641C\u7D22\u8D26\u53F7 / \u59D3\u540D / \u90AE\u7BB1\u2026", extra: _jsxs("div", { className: "flex items-center gap-2 text-[11px] text-muted-foreground", children: [_jsx(UsersIcon, { className: "h-3.5 w-3.5" }), "\u5171 ", _jsx("span", { className: "mono text-foreground/85", children: total }), " \u4F4D\u7528\u6237"] }) })] }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : (_jsx(DataTable, { columns: columns, rows: rows, loading: loading && !data, empty: search || role !== 'all' ? '没有符合条件的用户' : '暂无用户', emptyDescription: search || role !== 'all' ? '试试更换角色筛选或清空搜索关键词。' : '点击右上角「新建用户」添加第一位用户。', page: page, pageSize: pageSize, total: total, onPageChange: setPage, rowActions: (u) => (_jsxs(_Fragment, { children: [_jsx(RowBtn, { icon: Pencil, label: isSuperAdmin ? '编辑用户' : '仅超级管理员可编辑', tone: "primary", onClick: () => (isSuperAdmin ? openEdit(u) : toast.error('权限不足', '仅超级管理员可以编辑用户')) }), _jsx(RowBtn, { icon: Trash2, label: isSuperAdmin ? '删除用户' : '仅超级管理员可删除', tone: "danger", onClick: () => (isSuperAdmin ? setRemoving(u) : toast.error('权限不足', '仅超级管理员可以删除用户')) })] })) })), _jsx(Modal, { open: createOpen, onClose: () => setCreateOpen(false), title: "\u65B0\u5EFA\u7528\u6237", description: "\u521B\u5EFA\u540E\u7528\u6237\u5373\u53EF\u7528\u8BE5\u8D26\u53F7\u767B\u5F55\u95E8\u6237\uFF0C\u672A\u586B\u5199\u5BC6\u7801\u65F6\u4F7F\u7528\u9ED8\u8BA4\u5BC6\u7801 sti123456\u3002", size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateOpen(false), disabled: creating, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: submitCreate, loading: creating, children: "\u521B\u5EFA\u7528\u6237" })] }), children: _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u8D26\u53F7", required: true, hint: "\u767B\u5F55\u7528\u6237\u540D\uFF0C\u521B\u5EFA\u540E\u4E0D\u53EF\u4FEE\u6539", children: _jsx(Input, { value: form.username, onChange: (e) => setForm((s) => ({ ...s, username: e.target.value })), placeholder: "\u4F8B\u5982 chenxi" }) }), _jsx(Field, { label: "\u59D3\u540D", required: true, children: _jsx(Input, { value: form.name, onChange: (e) => setForm((s) => ({ ...s, name: e.target.value })), placeholder: "\u771F\u5B9E\u59D3\u540D" }) }), _jsx(Field, { label: "\u521D\u59CB\u5BC6\u7801", hint: "\u7559\u7A7A\u5219\u4F7F\u7528\u9ED8\u8BA4\u5BC6\u7801 sti123456", children: _jsx(Input, { type: "password", value: form.password, onChange: (e) => setForm((s) => ({ ...s, password: e.target.value })), placeholder: "\u5EFA\u8BAE\u4E0D\u5C11\u4E8E 6 \u4F4D" }) }), _jsx(Field, { label: "\u89D2\u8272", required: true, children: _jsx(Select, { value: form.role, onChange: (e) => setForm((s) => ({ ...s, role: e.target.value })), children: ROLE_ORDER.map((r) => (_jsx("option", { value: r, children: ROLES[r] }, r))) }) }), _jsx(Field, { label: "\u90AE\u7BB1", children: _jsx(Input, { type: "email", value: form.email, onChange: (e) => setForm((s) => ({ ...s, email: e.target.value })), placeholder: "name@university.edu.cn" }) }), _jsx(Field, { label: "\u5B66\u9662", children: _jsx(Input, { value: form.college, onChange: (e) => setForm((s) => ({ ...s, college: e.target.value })), placeholder: "\u4F8B\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662" }) })] }) }), _jsx(Drawer, { open: !!editing, onClose: () => setEditing(null), title: editing ? `编辑用户 · ${editing.name}` : '编辑用户', width: "max-w-xl", footer: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("p", { className: "text-[11px] text-muted-foreground", children: [_jsxs("span", { className: "mono", children: ["#", editing?.id] }), " \u00B7 ", editing?.username] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setEditing(null), disabled: saving, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: submitEdit, loading: saving, disabled: !isSuperAdmin, children: "\u4FDD\u5B58" })] })] }), children: _jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5", children: [_jsx(Avatar, { name: editing?.name ?? '', src: editing?.avatar, size: 44 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium", children: editing?.name }), _jsxs("p", { className: "mono truncate text-[11px] text-muted-foreground", children: [editing?.username, " \u00B7 \u6CE8\u518C\u4E8E ", fdatetime(editing?.createdAt)] })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u59D3\u540D", required: true, children: _jsx(Input, { value: editForm.name ?? '', onChange: (e) => setEditForm((s) => ({ ...s, name: e.target.value })) }) }), _jsx(Field, { label: "\u89D2\u8272", hint: isSuperAdmin ? '超级管理员拥有全部权限' : '仅超级管理员可修改角色', children: _jsx(Select, { value: editForm.role ?? 'student', disabled: !isSuperAdmin, onChange: (e) => setEditForm((s) => ({ ...s, role: e.target.value })), children: ROLE_ORDER.map((r) => (_jsx("option", { value: r, children: ROLES[r] }, r))) }) }), _jsx(Field, { label: "\u90AE\u7BB1", children: _jsx(Input, { value: editForm.email ?? '', onChange: (e) => setEditForm((s) => ({ ...s, email: e.target.value })) }) }), _jsx(Field, { label: "\u624B\u673A", children: _jsx(Input, { value: editForm.phone ?? '', onChange: (e) => setEditForm((s) => ({ ...s, phone: e.target.value })) }) }), _jsx(Field, { label: "\u5B66\u9662", children: _jsx(Input, { value: editForm.college ?? '', onChange: (e) => setEditForm((s) => ({ ...s, college: e.target.value })) }) }), _jsx(Field, { label: "\u5B66\u53F7", children: _jsx(Input, { value: editForm.studentId ?? '', onChange: (e) => setEditForm((s) => ({ ...s, studentId: e.target.value })) }) }), _jsx("div", { className: "sm:col-span-2", children: _jsx(Field, { label: "\u8D26\u53F7\u72B6\u6001", hint: "\u505C\u7528\u540E\u8BE5\u8D26\u53F7\u65E0\u6CD5\u767B\u5F55\uFF0C\u5386\u53F2\u6570\u636E\u4FDD\u7559", children: _jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3", children: [_jsx(Switch, { checked: !!editForm.isActive, onChange: (v) => isSuperAdmin
                                                        ? setEditForm((s) => ({ ...s, isActive: v }))
                                                        : toast.error('权限不足', '仅超级管理员可修改账号状态') }), _jsx("span", { className: "text-[12.5px] text-muted-foreground", children: editForm.isActive ? '启用中' : '已停用' })] }) }) })] }), !isSuperAdmin && (_jsxs("div", { className: "flex items-start gap-2.5 rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/[0.06] p-3.5 text-[11.5px] text-muted-foreground", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" }), "\u4F60\u6CA1\u6709\u4FEE\u6539\u7528\u6237\u4FE1\u606F\u7684\u6743\u9650\uFF0C\u4FDD\u5B58\u6309\u94AE\u5DF2\u7981\u7528\u3002"] }))] }) }), _jsx(ConfirmDialog, { open: !!removing, onClose: () => setRemoving(null), onConfirm: confirmRemove, loading: deleting, title: "\u5220\u9664\u7528\u6237", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u786E\u5B9A\u8981\u5220\u9664\u7528\u6237\u300C", removing?.name, "\u300D\u5417\uFF1F\u8BE5\u8D26\u53F7\u5C06\u7ACB\u5373\u5931\u6548\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002", _jsxs("span", { className: "mono mt-2 block text-[11px] text-muted-foreground", children: ["#", removing?.id, " \u00B7 ", removing?.username, " \u00B7 ", ROLES[removing?.role ?? ''] ?? removing?.role] })] }) }), _jsx(Modal, { open: broadcastOpen, onClose: () => setBroadcastOpen(false), title: "\u7FA4\u53D1\u7AD9\u5185\u6D88\u606F", description: "\u6D88\u606F\u4F1A\u53D1\u9001\u5230\u7528\u6237\u4E2D\u5FC3\u7684\u300C\u6211\u7684\u6D88\u606F\u300D\uFF0C\u4EC5\u53D1\u9001\u7ED9\u542F\u7528\u4E2D\u7684\u8D26\u53F7\u3002", size: "lg", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setBroadcastOpen(false), disabled: sending, children: "\u53D6\u6D88" }), _jsxs(Button, { variant: "primary", onClick: submitBroadcast, loading: sending, children: [_jsx(Megaphone, { className: "h-3.5 w-3.5" }), "\u7ACB\u5373\u53D1\u9001"] })] }), children: _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u63A5\u6536\u89D2\u8272", required: true, hint: "\u9009\u62E9\u300C\u5168\u90E8\u7528\u6237\u300D\u5C06\u53D1\u9001\u7ED9\u6240\u6709\u542F\u7528\u4E2D\u7684\u8D26\u53F7", children: _jsxs(Select, { value: bc.role, onChange: (e) => setBc((s) => ({ ...s, role: e.target.value })), children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u7528\u6237" }), _jsx("option", { value: "superadmin", children: "\u8D85\u7EA7\u7BA1\u7406\u5458" }), _jsx("option", { value: "admin", children: "\u7BA1\u7406\u5458" }), _jsx("option", { value: "member", children: "\u90E8\u95E8\u6210\u5458" }), _jsx("option", { value: "student", children: "\u5B66\u751F" })] }) }), _jsx(Field, { label: "\u8DF3\u8F6C\u94FE\u63A5", hint: "\u53EF\u9009\uFF0C\u4F8B\u5982 /activities \u6216 /account/messages", children: _jsx(Input, { value: bc.link, onChange: (e) => setBc((s) => ({ ...s, link: e.target.value })), placeholder: "/activities" }) }), _jsx("div", { className: "sm:col-span-2", children: _jsx(Field, { label: "\u6D88\u606F\u6807\u9898", required: true, children: _jsx(Input, { value: bc.title, onChange: (e) => setBc((s) => ({ ...s, title: e.target.value })), placeholder: "\u4F8B\u5982\uFF1A\u79D1\u6280\u521B\u65B0\u90E8 2026 \u6625\u5B63\u62DB\u65B0\u9762\u8BD5\u901A\u77E5" }) }) }), _jsx("div", { className: "sm:col-span-2", children: _jsx(Field, { label: "\u6D88\u606F\u5185\u5BB9", required: true, hint: `${bc.content.length} / 2000`, children: _jsx(Textarea, { rows: 6, maxLength: 2000, value: bc.content, onChange: (e) => setBc((s) => ({ ...s, content: e.target.value })), placeholder: "\u8BF7\u586B\u5199\u6D88\u606F\u6B63\u6587\uFF0C\u652F\u6301\u7EAF\u6587\u672C\u6362\u884C\u3002" }) }) })] }) })] }));
}
