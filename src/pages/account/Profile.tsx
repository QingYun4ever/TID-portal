import React, { useEffect, useMemo, useState } from 'react';
import { AtSign, Building2, GraduationCap, Hash, Image as ImageIcon, Phone, Save, User } from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { ROLES, cn } from '@/lib/utils';
import { Avatar, Button, Chip, Field, Glass, Input } from '@/components/ui';

/* =============================================================================
 * 用户中心 · 个人资料
 * 手写受控表单（不引入表单库），提交后刷新全局 auth 状态。
 * ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^1[3-9]\d{9}$/;

interface ProfileForm {
  name: string;
  studentId: string;
  college: string;
  email: string;
  phone: string;
  avatar: string;
}

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  useTitle('个人资料');

  /* ------------------------------ 个人资料 ------------------------------ */
  const initial = useMemo<ProfileForm>(
    () => ({
      name: user?.name ?? '',
      studentId: user?.studentId ?? '',
      college: user?.college ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      avatar: user?.avatar ?? '',
    }),
    [user]
  );

  const [form, setForm] = useState<ProfileForm>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saving, setSaving] = useState(false);

  /* 用户信息刷新后（例如首次进入）同步表单 */
  useEffect(() => setForm(initial), [initial]);

  const set = (k: keyof ProfileForm) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const dirty = (Object.keys(initial) as (keyof ProfileForm)[]).some((k) => initial[k] !== form[k]);

  const validateProfile = () => {
    const e: Partial<Record<keyof ProfileForm, string>> = {};
    if (!form.name.trim()) e.name = '请填写姓名';
    else if (form.name.trim().length > 24) e.name = '姓名不超过 24 个字符';
    if (form.studentId && !/^[A-Za-z0-9]{4,20}$/.test(form.studentId.trim())) e.studentId = '学号应为 4–20 位字母或数字';
    if (form.email && !EMAIL_RE.test(form.email.trim())) e.email = '邮箱格式不正确';
    if (form.phone && !PHONE_RE.test(form.phone.trim())) e.phone = '请填写 11 位大陆手机号';
    if (form.avatar && !/^(https?:\/\/|\/)/.test(form.avatar.trim())) e.avatar = '头像地址需以 http(s):// 或 / 开头';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveProfile = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateProfile()) {
      toast.error('请检查表单', '有字段填写不符合要求。');
      return;
    }
    setSaving(true);
    try {
      await AuthApi.updateMe({
        name: form.name.trim(),
        studentId: form.studentId.trim() || null,
        college: form.college.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        avatar: form.avatar.trim() || null,
      });
      await refresh();
      toast.success('资料已保存', '活动报名与项目申报将使用最新的联系方式。');
    } catch (e: any) {
      toast.error('保存失败', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = ROLES[user?.role ?? ''] ?? user?.role ?? '—';
  const completeness = [user?.name, user?.studentId, user?.college, user?.email, user?.phone, user?.avatar].filter(Boolean).length;
  const percent = Math.round((completeness / 6) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">个人资料</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          学号与手机号用于把活动报名、项目申报记录与当前账号关联，请务必填写准确。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* ----------------------------- 资料表单 ----------------------------- */}
        <Glass tone="soft" className="p-5 sm:p-6" data-reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={form.name || user?.name || ''} src={form.avatar || user?.avatar} size={76} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{form.name || user?.username}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip tone="primary" className="!px-2.5 !py-0.5">
                  {roleLabel}
                </Chip>
                <Chip className="mono !px-2.5 !py-0.5">
                  <Hash className="h-3 w-3" />
                  {form.studentId || '未绑定学号'}
                </Chip>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>资料完整度</span>
                  <span className="mono">{percent}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 transition-all duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 flex flex-col gap-4 border-t border-white/8 pt-6">
            <Field label="姓名" required error={errors.name}>
              <Input value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="请输入真实姓名" maxLength={24} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="学号" error={errors.studentId} hint="用于关联报名与申报记录">
                <Input
                  value={form.studentId}
                  onChange={(e) => set('studentId')(e.target.value)}
                  placeholder="如 2023010101"
                  className="mono"
                  inputMode="numeric"
                />
              </Field>
              <Field label="学院" hint="如 计算机科学与技术学院">
                <Input value={form.college} onChange={(e) => set('college')(e.target.value)} placeholder="请输入所在学院" />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="邮箱" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  placeholder="name@stu.edu.cn"
                  autoComplete="email"
                />
              </Field>
              <Field label="手机" error={errors.phone}>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone')(e.target.value)}
                  placeholder="11 位手机号"
                  className="mono"
                  maxLength={11}
                  autoComplete="tel"
                />
              </Field>
            </div>

            <Field label="头像 URL" error={errors.avatar} hint="留空则使用姓名首字生成的头像">
              <Input
                value={form.avatar}
                onChange={(e) => set('avatar')(e.target.value)}
                placeholder="/uploads/avatar.png 或 https://…"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty && !saving}>
                <Save className="h-4 w-4" />
                {dirty ? '保存资料' : '已是最新'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(initial);
                  setErrors({});
                }}
                disabled={!dirty || saving}
              >
                重置
              </Button>
              <span className="text-[11.5px] text-muted-foreground">
                <span className="mono">@{user?.username}</span> · 站内标识不可修改
              </span>
            </div>
          </form>
        </Glass>

        {/* --------------------------- 右侧：账号摘要 --------------------------- */}
        <div className="flex flex-col gap-5">
          <Glass tone="soft" className="p-5 sm:p-6" data-reveal="right">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <User className="h-4 w-4 text-primary" />
              账号摘要
            </h2>
            <dl className="mt-4 flex flex-col gap-3 text-[12.5px]">
              <Row icon={<AtSign className="h-3.5 w-3.5" />} label="站内标识" value={user?.username ?? '—'} mono />
              <Row icon={<User className="h-3.5 w-3.5" />} label="角色" value={roleLabel} />
              <Row icon={<Hash className="h-3.5 w-3.5" />} label="学号" value={form.studentId || '—'} mono />
              <Row icon={<Building2 className="h-3.5 w-3.5" />} label="学院" value={form.college || '—'} />
              <Row icon={<GraduationCap className="h-3.5 w-3.5" />} label="邮箱" value={form.email || '—'} />
              <Row icon={<Phone className="h-3.5 w-3.5" />} label="手机" value={form.phone || '—'} mono />
              <Row icon={<ImageIcon className="h-3.5 w-3.5" />} label="头像" value={form.avatar ? '已设置' : '未设置'} />
            </dl>
          </Glass>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-2.5 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={cn('clamp-1 text-right text-foreground/85', mono && 'mono')}>{value}</dd>
    </div>
  );
}
