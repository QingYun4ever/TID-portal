/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* 支持任意整百比例（bg-white/8、border-white/12 … 都可直接使用） */
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, String(i / 100)])),
      transitionDuration: Object.fromEntries(
        [0, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000].map((n) => [n, `${n}ms`])
      ),
      spacing: {
        4.5: '1.125rem',
        5.5: '1.375rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        dept: {
          /* 品牌色 —— 白 + 蓝，与全站配色纪律一致 */
          core: '#FFFFFF',
          beam: '#BAE6FD',
          orbit: '#7DD3FC',
          aurora: '#38BDF8',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
        '6xl': '3.5rem',
      },
      boxShadow: {
        /* 液态玻璃阴影层级 */
        glass: '0 1px 0 0 rgba(255,255,255,.10) inset, 0 -1px 0 0 rgba(0,0,0,.55) inset, 0 12px 40px -12px rgba(0,0,0,.85)',
        'glass-lift':
          '0 1px 0 0 rgba(255,255,255,.18) inset, 0 -1px 0 0 rgba(0,0,0,.55) inset, 0 30px 70px -24px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)',
        specular: '0 0 40px -12px rgba(125,211,252,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -1px 0 rgba(0,0,0,.45)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.045) 1px, transparent 1px)',
        'dot-grid': 'radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-24': '24px 24px',
        'dot-32': '32px 32px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(26px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'spin-rev': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(3%, -4%, 0) scale(1.08)' },
          '66%': { transform: 'translate3d(-3%, 3%, 0) scale(.96)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        pulseRing: {
          '0%': { transform: 'scale(.8)', opacity: '.7' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .6s ease both',
        'scale-in': 'scale-in .5s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 42s linear infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        'spin-rev': 'spin-rev 34s linear infinite',
        drift: 'drift 22s ease-in-out infinite',
        shimmer: 'shimmer 3.2s linear infinite',
        'pulse-ring': 'pulseRing 2.6s ease-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
