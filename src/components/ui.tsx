import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBodyLock, useEscape } from '@/lib/hooks';
import { useToast } from '@/lib/store';

/* =============================================================================
 * 1. 玻璃容器
 * ========================================================================== */

type GlassTone = 'default' | 'strong' | 'thin' | 'soft';

interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
  refract?: boolean;
  sheen?: boolean;
  hover?: boolean;
  /** 是否裁剪子元素（默认裁剪）。毛玻璃已挪到内衬层 .lg-blur，
   *  外壳的圆角裁剪走普通抗锯齿路径；但内部已自带圆角的内容（图片板等）
   *  仍建议传 clip={false}，让圆角只由内容自己负责，边缘更干净。 */
  clip?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'li' | 'nav';
}

const TONE: Record<GlassTone, string> = {
  default: 'lg',
  strong: 'lg-strong',
  thin: 'lg-thin',
  soft: 'lg-soft',
};

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  {
    tone = 'default',
    refract = true,
    sheen = false,
    hover = false,
    clip = true,
    as = 'div',
    className,
    children,
    ...rest
  },
  ref
) {
  const As: any = as;
  const inner = useRef<HTMLDivElement | null>(null);
  /* 进入时量一次尺寸，移动中只写 CSS 变量：
     避免每个 pointermove 都触发一次强制同步布局（getBoundingClientRect）。 */
  const rect = useRef<{ left: number; top: number; w: number; h: number } | null>(null);
  const frame = useRef(0);

  const measure = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    rect.current = { left: r.left, top: r.top, w: r.width || 1, h: r.height || 1 };
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = inner.current;
    const r = rect.current;
    if (!el || !r || frame.current) return;
    const x = ((e.clientX - r.left) / r.w) * 100;
    const y = ((e.clientY - r.top) / r.h) * 100;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      el.style.setProperty('--mx', `${x}%`);
      el.style.setProperty('--my', `${y}%`);
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    []
  );

  return (
    <As
      ref={(n: any) => {
        inner.current = n;
        if (typeof ref === 'function') ref(n);
        else if (ref) (ref as any).current = n;
      }}
      onPointerEnter={sheen ? measure : undefined}
      onPointerMove={sheen ? onMove : undefined}
      className={cn(
        TONE[tone],
        refract && 'lg-refract',
        sheen && 'lg-sheen',
        hover && 'lg-hover',
        clip && 'overflow-hidden',
        className
      )}
      {...rest}
    >
      {/* 毛玻璃放在内衬层上，而不是外壳本身（原因见 index.css 的 .lg-blur）。
          soft 调是平底棱台，本来就不模糊，不需要这一层。 */}
      {tone !== 'soft' && <span aria-hidden className="lg-blur" />}
      {children}
    </As>
  );
});

/** 玻璃卡片：默认带指针高光与悬浮上移 */
export function GlassCard({
  className,
  tone = 'soft',
  hover = true,
  sheen = true,
  children,
  ...rest
}: GlassProps) {
  return (
    <Glass tone={tone} hover={hover} sheen={sheen} className={cn('p-6', className)} {...rest}>
      {children}
    </Glass>
  );
}

/* =============================================================================
 * 2. 按钮
 * ========================================================================== */
type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  glass: 'btn-glass',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: 'btn-glass !bg-transparent',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
  'icon-sm': 'btn-icon btn-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('btn', VARIANT[variant], SIZE[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

/** 用 Link 渲染的按钮（保留路由语义） */
export function LinkButton({
  to,
  variant = 'glass',
  size = 'md',
  className,
  children,
  external,
  ...rest
}: {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const cls = cn('btn', VARIANT[variant], SIZE[size], className);
  if (external || /^https?:/.test(to))
    return (
      <a href={to} target="_blank" rel="noreferrer noopener" className={cls} {...rest}>
        {children}
      </a>
    );
  return (
    <Link to={to} className={cls} {...(rest as any)}>
      {children}
    </Link>
  );
}

/* =============================================================================
 * 3. 徽章 / 标签
 * ========================================================================== */
export function Chip({
  tone = 'default',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' }) {
  return (
    <span className={cn('chip', tone !== 'default' && `chip-${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}

/** 状态点 */
export function Dot({ tone = 'primary', pulse = false }: { tone?: string; pulse?: boolean }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary',
    success: 'bg-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning))]',
    danger: 'bg-[hsl(var(--destructive))]',
    muted: 'bg-muted-foreground',
  };
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className={cn('absolute inline-flex h-full w-full rounded-full opacity-70', colors[tone] ?? colors.primary)}
          style={{ animation: 'sti-pulse 2.2s ease-out infinite' }}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', colors[tone] ?? colors.primary)} />
    </span>
  );
}

/* =============================================================================
 * 4. 表单
 * ========================================================================== */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn('field', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 5, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn('field', className)} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={cn('field', className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="ml-1 text-[hsl(var(--destructive))]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2.5 text-sm', className)}>
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-200',
          checked
            ? 'border-primary/70 bg-primary/90 shadow-[0_0_14px_-2px_hsl(var(--primary)/.6)]'
            : 'border-white/20 bg-white/5 hover:border-white/35'
        )}
      >
        {checked && <Check className="h-3 w-3 text-[hsl(var(--primary-foreground))]" strokeWidth={3.2} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label && <span className="text-foreground/80">{label}</span>}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[24px] w-[44px] shrink-0 rounded-full border transition-all duration-300',
          checked
            ? 'border-primary/60 bg-primary/80 shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_0_18px_-4px_hsl(var(--primary)/.7)]'
            : 'border-white/15 bg-white/8'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-md transition-all duration-300',
            checked ? 'left-[24px]' : 'left-[3px]'
          )}
        />
      </button>
      {label && <span className="text-foreground/80">{label}</span>}
    </label>
  );
}

/** 搜索框 */
export function SearchInput({
  value,
  onChange,
  placeholder = '搜索…',
  className,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className="field pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label="清空"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* =============================================================================
 * 5. 弹层
 * ========================================================================== */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}) {
  useBodyLock(open);
  useEscape(onClose, open);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[96vw]' };
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
      <div
        className="scrim absolute inset-0 backdrop-blur-md"
        style={{ animation: 'sti-fade .25s ease both' }}
        onClick={onClose}
      />
      <Glass
        tone="strong"
        className={cn(
          'relative z-10 flex max-h-[88dvh] w-full flex-col',
          widths[size],
          className
        )}
        style={{ animation: 'sti-pop .34s cubic-bezier(.22,1,.36,1) both' }}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
            <div className="min-w-0">
              {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1 -mt-1 rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/8 px-6 py-4">{footer}</div>}
      </Glass>
    </div>,
    document.body
  );
}

/** 确认对话框 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  description,
  confirmText = '确认',
  tone = 'danger',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-foreground/75">{description}</p>
    </Modal>
  );
}

/** 侧滑抽屉 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
}) {
  useBodyLock(open);
  useEscape(onClose, open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex">
      <div className="scrim absolute inset-0 backdrop-blur-md" onClick={onClose} style={{ animation: 'sti-fade .25s ease both' }} />
      <div
        className={cn(
          'surface-drawer relative z-10 ml-auto flex h-full w-full flex-col border-l border-white/10 backdrop-blur-2xl',
          width,
          side === 'left' && 'mr-auto ml-0 border-l-0 border-r'
        )}
        style={{ animation: `sti-slide-${side} .38s cubic-bezier(.22,1,.36,1) both` }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div className="min-w-0 text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-white/8 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* =============================================================================
 * 6. 分区 / 标题
 * ========================================================================== */
export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  align = 'left',
  container = 'shell',
  screen = false,
}: {
  id?: string;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
  container?: 'shell' | 'wide' | 'none';
  /**
   * 「一屏一块」模式（首页用，默认关闭）。
   * 注意这里给的是 min-h 而不是 h：分区至少占到视口的 68%，内容更高就自然撑开。
   * 不再用 min-h-dvh —— 一旦某一屏的内容装不满一整屏（比如画廊只有一张图、
   * 组织架构数据为空），justify-center 就会在上下各留半屏空白，
   * 相邻两屏叠起来就是一整屏什么都没有的「大段空白」。
   */
  screen?: boolean;
}) {
  const cont = container === 'shell' ? 'shell' : container === 'wide' ? 'shell-wide' : '';
  return (
    <section
      id={id}
      className={cn(
        'relative scroll-mt-24',
        screen ? 'flex min-h-[68dvh] flex-col justify-center py-16 sm:py-20' : 'section-pad',
        className
      )}
    >
      <div className={cont}>
        {(eyebrow || title || action) && (
          <div
            className={cn(
              'mb-6 flex flex-col gap-5',
              align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
            )}
            data-reveal
          >
            <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
              {eyebrow && <div className="eyebrow mb-3.5">{eyebrow}</div>}
              {title && (
                <h2 className="text-balance text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">{description}</p>
              )}
            </div>
            {action && (
              /* 动作按钮比标题晚一步到位，给每个分区一个统一的「先标题、后入口」节奏 */
              <div className="flex shrink-0 items-center gap-3" data-reveal="right" style={{ transitionDelay: '90ms' }}>
                {action}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * 页面头部（内页用）。
 * pt 要压住那条 68px 的固定导航；pb 只负责和下方第一个分区的 pt 拼出呼吸感，
 * 所以给得比 pt 小得多 —— 两边都给足反而会在标题和正文之间挖出一段空白。
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  breadcrumb,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <header className="relative overflow-hidden pb-10 pt-28 sm:pb-12 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[46vh]"
        style={{ background: 'linear-gradient(180deg, rgba(186,230,253,.08), transparent 76%)' }}
      />
      <div className="shell relative">
        {breadcrumb && <Breadcrumb items={breadcrumb} className="mb-6" />}
        {eyebrow && <div className="eyebrow mb-5">{eyebrow}</div>}
        <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          <span className="spotlight-text">{title}</span>
        </h1>
        {description && (
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

export function Breadcrumb({ items, className }: { items: { label: string; to?: string }[]; className?: string }) {
  return (
    <nav className={cn('flex flex-wrap items-center gap-2 text-xs text-muted-foreground', className)}>
      <Link to="/" className="transition hover:text-foreground">
        首页
      </Link>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <span className="text-white/20">/</span>
          {it.to ? (
            <Link to={it.to} className="transition hover:text-foreground">
              {it.label}
            </Link>
          ) : (
            <span className="text-foreground/80">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* =============================================================================
 * 7. Tabs
 * ========================================================================== */
export function Tabs({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: {
  items: { value: string; label: React.ReactNode; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (el && listRef.current) {
      const p = listRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - p.left + listRef.current.scrollLeft, width: r.width, ready: true });
    }
  }, [value, items.length]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={listRef}
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl"
      >
        <span
          className="absolute top-1 h-[calc(100%-8px)] rounded-full bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,.22)] transition-all duration-400 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {items.map((it) => (
          <button
            key={it.value}
            data-tab={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'relative z-10 shrink-0 rounded-full font-medium transition-colors duration-300',
              size === 'sm' ? 'px-3.5 py-1.5 text-sm' : 'px-5 py-2 text-base',
              value === it.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/85'
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn('ml-1.5 text-xs', value === it.value ? 'text-primary' : 'text-muted-foreground')}>
                {it.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
 * 8. 状态 / 反馈
 * ========================================================================== */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl bg-white/[0.045]', className)}
      style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgb(var(--tw-white) / .055), transparent)', backgroundSize: '200% 100%', animation: 'sti-shimmer 1.6s linear infinite' }}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}>
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-foreground/90">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="加载失败"
      description={message}
      action={onRetry && <Button onClick={onRetry}>重试</Button>}
    />
  );
}

/* =============================================================================
 * 9. 分页
 * ========================================================================== */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const nums: (number | '…')[] = [];
  const push = (n: number | '…') => nums.push(n);
  const window = 1;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - window && i <= page + window)) push(i);
    else if (nums[nums.length - 1] !== '…') push('…');
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Button size="icon-sm" variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="上一页">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'h-8 min-w-8 rounded-full px-2.5 text-xs font-medium transition-all duration-300',
              n === page
                ? 'bg-primary/90 text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_-4px_hsl(var(--primary)/.7)]'
                : 'text-muted-foreground hover:bg-white/8 hover:text-foreground'
            )}
          >
            {n}
          </button>
        )
      )}
      <Button size="icon-sm" variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="下一页">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* =============================================================================
 * 10. 数据展示
 * ========================================================================== */
export function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  className,
  tone = 'primary',
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  trend?: { value: string; up?: boolean };
  className?: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
}) {
  const tones = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-[hsl(var(--success))]',
    warning: 'text-[hsl(var(--warning))]',
  };
  return (
    <Glass tone="soft" hover sheen className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className={cn('shrink-0 opacity-80', tones[tone])}>{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn('mono text-2xl font-semibold tabular-nums', tones[tone])}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {trend && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          <span className={trend.up ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        </div>
      )}
    </Glass>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  className,
  height = 6,
}: {
  value: number;
  max?: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
  height?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const tones = {
    primary: 'bg-primary',
    success: 'bg-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning))]',
    danger: 'bg-[hsl(var(--destructive))]',
    accent: 'bg-[hsl(var(--accent))]',
  };
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-white/8', className)} style={{ height }}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const tones = [
    'from-white/18 to-white/[0.05]',
    'from-primary/22 to-primary/[0.06]',
    'from-white/14 to-white/[0.04]',
    'from-white/20 to-white/[0.06]',
    'from-primary/16 to-white/[0.04]',
  ];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const tone = tones[h % tones.length];
  const label = !name ? '?' : /[\u4e00-\u9fa5]/.test(name) ? name.slice(-2) : name.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-gradient-to-br font-medium text-foreground/90',
        tone,
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : label}
    </div>
  );
}

/** 倒计时文本
 *  列表页往往同屏出现十几个倒计时。距截止还有数天时逐秒刷新只是噪音，
 *  却会让 React 每秒重渲染十几个节点（滚动时尤其浪费）。
 *  因此：> 2 天 → 只到分钟、30s 一跳；≤ 2 天 → 精确到秒、1s 一跳。 */
export function Countdown({ target, className }: { target: string | null | undefined; className?: string }) {
  const d = target ? new Date(String(target).replace(' ', 'T')) : null;
  const valid = !!d && !Number.isNaN(d.getTime());
  const deadline = valid ? d!.getTime() : 0;

  const [now, setNow] = useState(() => Date.now());
  /* 剩余 > 2 天时按 30s 粒度刷新 */
  const coarse = valid && deadline - now > 2 * 86400000;

  useEffect(() => {
    if (!valid) return;
    const t = setInterval(() => setNow(Date.now()), coarse ? 30000 : 1000);
    return () => clearInterval(t);
  }, [valid, coarse]);

  if (!valid) return <span className={className}>—</span>;
  const diff = deadline - now;
  if (diff <= 0) return <span className={cn('text-muted-foreground', className)}>已截止</span>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const urgent = days <= 3;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className={cn('mono tabular-nums', urgent ? 'text-[hsl(var(--destructive))]' : 'text-primary', className)}>
      {days > 0 && `${days}天 `}
      {coarse ? `${pad(hours)}:${pad(minutes)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
    </span>
  );
}

/* =============================================================================
 * 11. 表格
 * ========================================================================== */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative w-full overflow-x-auto rounded-2xl border border-white/8', className)}>{children}</div>
  );
}

export function Th({ children, className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-white/8 bg-white/[0.035] px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-white/6 px-4 py-3 align-middle text-sm text-foreground/85', className)} {...rest}>
      {children}
    </td>
  );
}

/* =============================================================================
 * 12. Toast 视口
 * ========================================================================== */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  const tones = {
    success: 'border-[hsl(var(--success))]/35 text-[hsl(var(--success))]',
    error: 'border-[hsl(var(--destructive))]/40 text-[hsl(var(--destructive))]',
    info: 'border-primary/35 text-primary',
    warning: 'border-[hsl(var(--warning))]/40 text-[hsl(var(--warning))]',
  };
  return createPortal(
    <div className="pointer-events-none fixed bottom-6 right-6 z-[120] flex w-[min(92vw,360px)] flex-col gap-2.5">
      {toasts.map((t) => (
        <Glass
          key={t.id}
          tone="strong"
          className={cn('pointer-events-auto flex items-start gap-3 border p-4', tones[t.tone])}
          style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t.title}</p>
            {t.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="rounded-full p-1 text-muted-foreground transition hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </Glass>
      ))}
    </div>,
    document.body
  );
}

/* =============================================================================
 * 13. 其它
 * ========================================================================== */
/** 折叠面板 */
export function Accordion({ items, className }: { items: { q: string; a: React.ReactNode }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className={cn('divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025]', className)}>
      {items.map((it, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-white/[0.035]"
          >
            <span className="text-sm font-medium text-foreground/90">{it.q}</span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300', open === i && 'rotate-180')}
            />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground" style={{ animation: 'sti-fade .3s ease both' }}>
              {it.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 分组标签（卡片顶部小标签） */
export function Tag({ children, tone = 'default', className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return <Chip tone={tone as any} className={className}>{children}</Chip>;
}

/** 视差滚动容器（轻微） */
export function Parallax({
  children,
  speed = 0.06,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* 元素在文档中的中心位置只量一次（尺寸变化时重量）：
       滚动时再 getBoundingClientRect 会在每帧强制同步布局。 */
    let center = 0;
    let raf = 0;
    const measure = () => {
      const prev = el.style.transform;
      el.style.transform = 'none'; // 量的是未位移时的原始位置
      const r = el.getBoundingClientRect();
      center = r.top + window.scrollY + r.height / 2;
      el.style.transform = prev;
    };
    const paint = () => {
      raf = 0;
      const mid = center - window.scrollY - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-mid * speed).toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onResize = () => {
      measure();
      paint();
    };

    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}

export { Link, useLocation, useId };
