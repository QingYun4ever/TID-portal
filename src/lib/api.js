/* =============================================================================
 * API 客户端 — 统一 fetch 封装，自动带令牌，统一错误处理
 * ========================================================================== */
const TOKEN_KEY = 'sti_token';
export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    }
    catch {
        return null;
    }
}
export function setToken(t) {
    try {
        if (t)
            localStorage.setItem(TOKEN_KEY, t);
        else
            localStorage.removeItem(TOKEN_KEY);
    }
    catch {
        /* ignore */
    }
}
export class ApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}
export async function api(path, opts = {}) {
    const token = getToken();
    const isForm = opts.body instanceof FormData;
    const headers = { Accept: 'application/json', ...(opts.headers || {}) };
    if (!isForm && opts.body !== undefined)
        headers['Content-Type'] = 'application/json';
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    let res;
    try {
        res = await fetch(`/api${path}`, {
            method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
            headers,
            body: isForm ? opts.body : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: opts.signal,
            credentials: 'include',
        });
    }
    catch (e) {
        if (e?.name === 'AbortError')
            throw e;
        throw new ApiError('网络连接失败，请检查网络后重试', 0, 'NETWORK');
    }
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        json = null;
    }
    if (!res.ok) {
        const msg = json?.error || (res.status === 401 ? '请先登录' : `请求失败（${res.status}）`);
        if (res.status === 401 && getToken())
            setToken(null);
        throw new ApiError(msg, res.status, json?.code);
    }
    if (json && typeof json === 'object' && 'data' in json)
        return json;
    return json;
}
/** 只取 data 字段的便捷封装 */
export async function apiData(path, opts = {}) {
    const r = await api(path, opts);
    return r.data;
}
/** 带附加字段（counts / categories 等） */
export async function apiFull(path, opts = {}) {
    return api(path, opts);
}
/* ------------------------------ 具体接口 -------------------------------- */
export const AuthApi = {
    login: (username, password) => apiData('/auth/login', { body: { username, password } }),
    register: (data) => apiData('/auth/register', { body: data }),
    logout: () => apiData('/auth/logout', { body: {} }),
    me: () => apiData('/auth/me'),
    updateMe: (data) => apiData('/auth/me', { method: 'PATCH', body: data }),
    changePassword: (oldPassword, newPassword) => apiData('/auth/change-password', { body: { oldPassword, newPassword } }),
    signups: () => apiData('/auth/my/signups'),
    applications: () => apiData('/auth/my/applications'),
    joinApplications: () => apiData('/auth/my/join-applications'),
    myFeedback: () => apiData('/auth/my/feedback'),
    messages: () => api('/auth/messages'),
    readMessages: (id) => apiData('/auth/messages/read', { body: { id } }),
    deleteMessage: (id) => apiData(`/auth/messages/${id}`, { method: 'DELETE' }),
    advisors: () => apiData('/auth/advisors'),
    teammates: () => apiData('/auth/teammates'),
};
export const PublicApi = {
    settings: () => apiData('/settings'),
    overview: () => apiData('/overview'),
    page: (key) => apiData(`/pages/${key}`),
    articles: (params = {}) => apiFull(`/articles?${qs(params)}`),
    article: (slug) => api(`/articles/${slug}`),
    activities: (params = {}) => apiFull(`/activities?${qs(params)}`),
    activityCalendar: (year, month) => apiData(`/activities/calendar?year=${year}&month=${month}`),
    activity: (slug) => api(`/activities/${slug}`),
    projects: (params = {}) => apiFull(`/projects?${qs(params)}`),
    project: (slug) => api(`/projects/${slug}`),
    competitions: (params = {}) => apiFull(`/competitions?${qs(params)}`),
    resources: (params = {}) => apiFull(`/resources?${qs(params)}`),
    join: () => apiData('/join'),
    feedback: (params = {}) => apiFull(`/feedback?${qs(params)}`),
    galleryAreas: () => apiData('/gallery/areas'),
    galleryImages: (params = {}) => apiFull(`/gallery/images?${qs(params)}`),
    about: () => apiData('/about'),
    changelog: () => apiData('/changelog'),
    search: (q, scope = 'all') => apiData(`/search?q=${encodeURIComponent(q)}&scope=${scope}`),
    tags: () => apiData('/tags'),
};
export const SubmitApi = {
    signupActivity: (id, data) => apiData(`/activities/${id}/signup`, { body: data }),
    cancelSignup: (id, studentId) => apiData(`/activities/${id}/cancel`, { body: { studentId } }),
    applyProject: (data) => apiData('/projects/apply', { body: data }),
    applyJoin: (data) => apiData('/join/apply', { body: data }),
    feedback: (data) => apiData('/feedback', { body: data }),
    likeFeedback: (id) => apiData(`/feedback/${id}/like`, { body: {} }),
    subscribeCompetition: (id, email) => apiData(`/competitions/${id}/subscribe`, { body: { email } }),
    downloadResource: (id) => apiData(`/resources/${id}/download`, { body: {} }),
    teamRequest: (data) => apiData('/team-requests', { body: data }),
    advisorAppointment: (data) => apiData('/advisor-appointments', { body: data }),
};
export const AdminApi = {
    stats: () => apiData('/admin/stats'),
    dbSummary: () => apiData('/admin/db-summary'),
    logs: (params = {}) => apiFull(`/admin/logs?${qs(params)}`),
    clearLogs: () => apiData('/admin/logs', { method: 'DELETE' }),
    settings: () => apiData('/admin/settings'),
    saveSettings: (data) => apiData('/admin/settings', { method: 'PUT', body: data }),
    pages: () => apiData('/admin/pages'),
    savePage: (key, data) => apiData(`/admin/pages/${key}`, { method: 'PUT', body: data }),
    users: (params = {}) => apiFull(`/admin/users?${qs(params)}`),
    createUser: (data) => apiData('/admin/users', { body: data }),
    updateUser: (id, data) => apiData(`/admin/users/${id}`, { method: 'PATCH', body: data }),
    deleteUser: (id) => apiData(`/admin/users/${id}`, { method: 'DELETE' }),
    broadcast: (data) => apiData('/admin/users/broadcast', { body: data }),
    upload: async (files) => {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f));
        return apiData('/admin/upload', { body: fd });
    },
    exportUrl: (kind, params = {}) => `/api/admin/export/${kind}?${qs(params)}`,
    /** 通用资源 CRUD */
    resource: (name) => ({
        list: (params = {}) => apiFull(`/admin/${name}?${qs(params)}`),
        get: (id) => apiData(`/admin/${name}/${id}`),
        create: (data) => apiData(`/admin/${name}`, { body: data }),
        update: (id, data) => apiData(`/admin/${name}/${id}`, { method: 'PATCH', body: data }),
        remove: (id) => apiData(`/admin/${name}/${id}`, { method: 'DELETE' }),
    }),
    signups: (params = {}) => apiFull(`/admin/signups?${qs(params)}`),
    checkin: (id, checkedIn) => apiData(`/admin/signups/${id}/checkin`, { body: { checkedIn } }),
    deleteSignup: (id) => apiData(`/admin/signups/${id}`, { method: 'DELETE' }),
    applications: (params = {}) => apiFull(`/admin/applications?${qs(params)}`),
    reviewApplication: (id, status, reviewNote) => apiData(`/admin/applications/${id}`, { method: 'PATCH', body: { status, reviewNote } }),
    joinApplications: (params = {}) => apiFull(`/admin/join-applications?${qs(params)}`),
    reviewJoin: (id, status, reviewNote) => apiData(`/admin/join-applications/${id}`, { method: 'PATCH', body: { status, reviewNote } }),
    deleteJoin: (id) => apiData(`/admin/join-applications/${id}`, { method: 'DELETE' }),
    feedback: (params = {}) => apiFull(`/admin/feedback?${qs(params)}`),
    replyFeedback: (id, reply, status) => apiData(`/admin/feedback/${id}`, { method: 'PATCH', body: { reply, status } }),
    deleteFeedback: (id) => apiData(`/admin/feedback/${id}`, { method: 'DELETE' }),
    galleryAreas: () => apiFull('/admin/gallery/areas'),
    galleryImages: (params = {}) => apiFull(`/admin/gallery/images?${qs(params)}`),
    addGalleryImages: (data) => apiData('/admin/gallery/images', { body: data }),
    updateGalleryImage: (id, data) => apiData(`/admin/gallery/images/${id}`, { method: 'PATCH', body: data }),
    deleteGalleryImage: (id) => apiData(`/admin/gallery/images/${id}`, { method: 'DELETE' }),
    batchGallery: (data) => apiData('/admin/gallery/images/batch', { body: data }),
};
export function qs(params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '')
            continue;
        sp.set(k, String(v));
    }
    return sp.toString();
}
