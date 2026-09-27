import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
export function useApi(fetcher, deps = [], opts = {}) {
    const enabled = opts.enabled !== false;
    const [data, setData] = useState(null);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const [nonce, setNonce] = useState(0);
    const first = useRef(true);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        let alive = true;
        if (first.current || !data)
            setLoading(true);
        first.current = false;
        fetcherRef
            .current()
            .then((res) => {
            if (!alive)
                return;
            if (res && typeof res === 'object' && 'data' in res) {
                setData(res.data);
                const { data: _d, ok: _o, ...rest } = res;
                setMeta(rest);
            }
            else {
                setData(res);
                setMeta({});
            }
            setError(null);
        })
            .catch((e) => {
            if (!alive || e?.name === 'AbortError')
                return;
            setError(e?.message || '加载失败');
        })
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce, enabled]);
    const reload = useCallback(() => setNonce((n) => n + 1), []);
    return { data, meta, loading, error, reload, setData };
}
/* =============================================================================
 * 滚动揭示 —— 全局一次 IntersectionObserver
 * ========================================================================== */
let observer = null;
let observed = 0;
function getObserver() {
    if (!observer && typeof window !== 'undefined') {
        observer = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    observer.unobserve(e.target);
                    observed--;
                }
            }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    }
    return observer;
}
export function useReveal() {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const nodes = el.hasAttribute('data-reveal') ? [el] : Array.from(el.querySelectorAll('[data-reveal]'));
        const ob = getObserver();
        if (!ob)
            return;
        nodes.forEach((n) => {
            if (n.classList.contains('is-in'))
                return;
            ob.observe(n);
            observed++;
        });
        return () => nodes.forEach((n) => ob.unobserve(n));
    }, []);
    return ref;
}
/** 全局在每次路由变化后重新扫描 */
export function useRevealScan(dep) {
    useEffect(() => {
        const ob = getObserver();
        if (!ob)
            return;
        const t = setTimeout(() => {
            document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((n) => ob.observe(n));
        }, 40);
        return () => clearTimeout(t);
    }, [dep]);
}
const scrolledSubs = new Set();
let scrollBound = false;
let scrolledFlag = false;
function bindScroll() {
    if (scrollBound || typeof window === 'undefined')
        return;
    scrollBound = true;
    const root = document.documentElement;
    let raf = 0;
    let max = 0;
    let lastP = -1;
    const measure = () => {
        max = root.scrollHeight - window.innerHeight;
    };
    const paint = () => {
        raf = 0;
        const y = window.scrollY;
        const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        const q = Math.round(p * 1000) / 1000; // 千分位量化，避免把无意义的浮点抖动写进样式
        if (q !== lastP) {
            lastP = q;
            root.style.setProperty('--scroll-p', String(q));
        }
        const s = y > 24;
        if (s !== scrolledFlag) {
            scrolledFlag = s;
            scrolledSubs.forEach((fn) => fn(s));
        }
    };
    const onScroll = () => {
        if (!raf)
            raf = requestAnimationFrame(paint); // 一帧一次，不做 cancel + 重新排队
    };
    const onResize = () => {
        measure();
        paint();
    };
    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    /* 懒加载内容会改变文档高度 —— 观察 body 尺寸，而不是每帧去读 scrollHeight */
    if (typeof ResizeObserver !== 'undefined')
        new ResizeObserver(onResize).observe(document.body);
}
/** 是否已经向下滚动（导航栏收缩用）。滚动进度请直接用 CSS 变量 --scroll-p */
export function useScrollProgress() {
    const [scrolled, setScrolled] = useState(scrolledFlag);
    useEffect(() => {
        bindScroll();
        setScrolled(scrolledFlag);
        scrolledSubs.add(setScrolled);
        return () => {
            scrolledSubs.delete(setScrolled);
        };
    }, []);
    return { scrolled };
}
/**
 * 只挂上滚动监听，把进度写进 :root 的 --scroll-p，自己不产生任何 state。
 * 想画进度条就用 CSS（见 .scroll-progress），这样滚动全程零重渲染。
 */
export function useScrollVar() {
    useEffect(() => {
        bindScroll();
    }, []);
}
export function useActiveSection(ids) {
    const key = ids.join(',');
    const [active, setActive] = useState(ids[0] ?? '');
    useEffect(() => {
        const list = key ? key.split(',') : [];
        if (!list.length)
            return;
        /* 位置只量一次，滚动时只比较数字 */
        let tops = [];
        const measure = () => {
            const y = window.scrollY;
            tops = [];
            for (const id of list) {
                const el = document.getElementById(id);
                if (el)
                    tops.push({ id, top: el.getBoundingClientRect().top + y });
            }
            tops.sort((a, b) => a.top - b.top);
        };
        let current = '';
        let raf = 0;
        const pick = () => {
            raf = 0;
            if (!tops.length)
                return;
            const line = window.scrollY + window.innerHeight * 0.34;
            let best = tops[0].id;
            for (const t of tops) {
                if (t.top > line)
                    break;
                best = t.id;
            }
            if (best !== current) {
                current = best;
                setActive(best);
            }
        };
        const onScroll = () => {
            if (!raf)
                raf = requestAnimationFrame(pick);
        };
        const onResize = () => {
            measure();
            pick();
        };
        measure();
        pick();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
        ro?.observe(document.body);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            ro?.disconnect();
            if (raf)
                cancelAnimationFrame(raf);
        };
    }, [key]);
    return active;
}
/* =============================================================================
 * 数字滚动
 * ========================================================================== */
export function useCountUp(target, duration = 1500, start = false) {
    const [value, setValue] = useState(0);
    const done = useRef(false);
    useEffect(() => {
        if (!start || done.current)
            return;
        done.current = true;
        const t0 = performance.now();
        let raf = 0;
        const tick = (t) => {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            /* 显示的是整数，取整后没变就不重渲染 —— 大数字每帧一跳，小数字只跳几次 */
            const v = Math.round(target * eased);
            setValue((prev) => (prev === v ? prev : v));
            if (p < 1)
                raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [start, target, duration]);
    return value;
}
/** 元素进入视口时返回 true（用于触发统计动画） */
export function useInView(threshold = 0.25) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const ob = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                setInView(true);
                ob.disconnect();
            }
        }, { threshold });
        ob.observe(el);
        return () => ob.disconnect();
    }, [threshold]);
    return { ref, inView };
}
/* =============================================================================
 * 其它
 * ========================================================================== */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
}
export function useDebounced(value, ms = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}
export function useLocalStorage(key, initial) {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : initial;
        }
        catch {
            return initial;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            /* ignore */
        }
    }, [key, value]);
    return [value, setValue];
}
/** 鼠标位置写入 CSS 变量，驱动玻璃高光 */
export function usePointerSheen() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        /* 触屏设备没有悬停高光，直接不监听 */
        if (typeof matchMedia !== 'undefined' && !matchMedia('(hover: hover) and (pointer: fine)').matches)
            return;
        /* 尺寸在进入时量一次：每次 pointermove 都 getBoundingClientRect 会强制同步布局 */
        let box = null;
        let raf = 0;
        let x = 0;
        let y = 0;
        const measure = () => {
            box = el.getBoundingClientRect();
        };
        const write = () => {
            raf = 0;
            el.style.setProperty('--mx', `${x}%`);
            el.style.setProperty('--my', `${y}%`);
        };
        const onMove = (e) => {
            if (!box)
                measure();
            x = ((e.clientX - box.left) / box.width) * 100;
            y = ((e.clientY - box.top) / box.height) * 100;
            if (!raf)
                raf = requestAnimationFrame(write);
        };
        const onLeave = () => {
            box = null;
        };
        el.addEventListener('pointerenter', measure);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
            el.removeEventListener('pointerenter', measure);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
            if (raf)
                cancelAnimationFrame(raf);
        };
    }, []);
    return ref;
}
/** 页面标题 */
export function useTitle(title) {
    useEffect(() => {
        const prev = document.title;
        document.title = title ? `${title} · 科技创新部` : '科技创新部 · Technology & Innovation Department';
        return () => {
            document.title = prev;
        };
    }, [title]);
}
/** Esc 键 */
export function useEscape(handler, active = true) {
    useEffect(() => {
        if (!active)
            return;
        const onKey = (e) => {
            if (e.key === 'Escape')
                handler();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handler, active]);
}
/** 锁滚动（弹窗/灯箱） */
export function useBodyLock(locked) {
    useEffect(() => {
        if (!locked)
            return;
        const prev = document.body.style.overflow;
        const pad = document.body.style.paddingRight;
        const sw = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (sw > 0)
            document.body.style.paddingRight = `${sw}px`;
        return () => {
            document.body.style.overflow = prev;
            document.body.style.paddingRight = pad;
        };
    }, [locked]);
}
/** 定时刷新 */
export function useInterval(fn, ms) {
    const ref = useRef(fn);
    ref.current = fn;
    useEffect(() => {
        if (ms === null)
            return;
        const t = setInterval(() => ref.current(), ms);
        return () => clearInterval(t);
    }, [ms]);
}
