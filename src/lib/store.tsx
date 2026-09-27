import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, PublicApi, getToken, setToken } from './api';

/* =============================================================================
 * 认证上下文
 * ========================================================================== */
export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'member' | 'student';
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  studentId?: string | null;
  college?: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  stats: any;
  ready: boolean;
  login: (u: string, p: string) => Promise<AuthUser>;
  register: (data: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** 至少 admin 权限（后台入口） */
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStats(null);
      setReady(true);
      return;
    }
    try {
      const r = await AuthApi.me();
      setUser(r?.user ?? null);
      setStats(r?.stats ?? null);
    } catch {
      setUser(null);
      setStats(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const r = await AuthApi.login(username, password);
    setToken(r.token);
    setUser(r.user);
    void refresh();
    return r.user as AuthUser;
  }, [refresh]);

  const register = useCallback(async (data: Record<string, unknown>) => {
    const r = await AuthApi.register(data);
    setToken(r.token);
    setUser(r.user);
    void refresh();
    return r.user as AuthUser;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await AuthApi.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setStats(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      stats,
      ready,
      login,
      register,
      logout,
      refresh,
      isAdmin: !!user && (user.role === 'admin' || user.role === 'superadmin'),
      isSuperAdmin: user?.role === 'superadmin',
      isMember: !!user && user.role !== 'student',
    }),
    [user, stats, ready, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}

/* =============================================================================
 * 站点设置
 * ========================================================================== */
interface SettingsCtx {
  settings: Record<string, string>;
  ready: boolean;
  refresh: () => void;
}
const SettingsContext = createContext<SettingsCtx>({ settings: {}, ready: false, refresh: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    PublicApi.settings()
      .then((s) => alive && setSettings(s || {}))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [nonce]);

  const value = useMemo(
    () => ({ settings, ready, refresh: () => setNonce((n) => n + 1) }),
    [settings, ready]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

/* =============================================================================
 * Toast 通知
 * ========================================================================== */
export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: 'success' | 'error' | 'info' | 'warning';
}
interface ToastCtx {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: number) => void;
}
const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === 'error' ? 6000 : 4200);
    },
    [dismiss]
  );
  const success = useCallback((title: string, description?: string) => push({ title, description, tone: 'success' }), [push]);
  const error = useCallback((title: string, description?: string) => push({ title, description, tone: 'error' }), [push]);
  const info = useCallback((title: string, description?: string) => push({ title, description, tone: 'info' }), [push]);

  const value = useMemo(() => ({ toasts, push, success, error, info, dismiss }), [toasts, push, success, error, info, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}
