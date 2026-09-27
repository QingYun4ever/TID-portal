import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, PublicApi, getToken, setToken } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
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
        }
        catch {
            setUser(null);
            setStats(null);
        }
        finally {
            setReady(true);
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const login = useCallback(async (username, password) => {
        const r = await AuthApi.login(username, password);
        setToken(r.token);
        setUser(r.user);
        void refresh();
        return r.user;
    }, [refresh]);
    const register = useCallback(async (data) => {
        const r = await AuthApi.register(data);
        setToken(r.token);
        setUser(r.user);
        void refresh();
        return r.user;
    }, [refresh]);
    const logout = useCallback(async () => {
        try {
            await AuthApi.logout();
        }
        catch {
            /* ignore */
        }
        setToken(null);
        setUser(null);
        setStats(null);
    }, []);
    const value = useMemo(() => ({
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
    }), [user, stats, ready, login, register, logout, refresh]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth 必须在 AuthProvider 内使用');
    return ctx;
}
const SettingsContext = createContext({ settings: {}, ready: false, refresh: () => { } });
export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [ready, setReady] = useState(false);
    const [nonce, setNonce] = useState(0);
    useEffect(() => {
        let alive = true;
        PublicApi.settings()
            .then((s) => alive && setSettings(s || {}))
            .catch(() => { })
            .finally(() => alive && setReady(true));
        return () => {
            alive = false;
        };
    }, [nonce]);
    const value = useMemo(() => ({ settings, ready, refresh: () => setNonce((n) => n + 1) }), [settings, ready]);
    return _jsx(SettingsContext.Provider, { value: value, children: children });
}
export function useSettings() {
    return useContext(SettingsContext);
}
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
    const push = useCallback((t) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
        setTimeout(() => dismiss(id), t.tone === 'error' ? 6000 : 4200);
    }, [dismiss]);
    const success = useCallback((title, description) => push({ title, description, tone: 'success' }), [push]);
    const error = useCallback((title, description) => push({ title, description, tone: 'error' }), [push]);
    const info = useCallback((title, description) => push({ title, description, tone: 'info' }), [push]);
    const value = useMemo(() => ({ toasts, push, success, error, info, dismiss }), [toasts, push, success, error, info, dismiss]);
    return _jsx(ToastContext.Provider, { value: value, children: children });
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast 必须在 ToastProvider 内使用');
    return ctx;
}
