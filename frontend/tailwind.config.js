/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Electric violet-blue — primary brand
        brand: {
          50:  '#f0f0ff',
          100: '#e2e2ff',
          200: '#c8c7ff',
          300: '#a8a4ff',
          400: '#8b85ff',
          500: '#6e66f8',
          600: '#5649e8',
          700: '#4539cc',
          800: '#382fb0',
          900: '#2f288a',
          950: '#1c1660',
        },
        // Electric cyan — data highlight, secondary accent
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Vivid lime — breakout, positive outlier
        lime: {
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
        },
        // Amber / gold — watchlist, top performers, warnings
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        // Rose-pink — secondary accent / special
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        // Performance: vivid emerald
        good: {
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Performance: vivid red
        bad: {
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Warn orange
        warn: {
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
        },
        // Surface scale — rich dark blue-blacks
        surface: {
          950: '#03040a',
          900: '#06070f',
          850: '#0a0c18',
          800: '#0f1120',
          750: '#141729',
          700: '#1a1d33',
          650: '#20243d',
          600: '#272b48',
          550: '#2e3354',
          500: '#363b61',
          450: '#3f456e',
          400: '#484f7a',
        },
        // High-contrast ink (text)
        ink: {
          50:  '#ffffff',
          100: '#f2f3ff',
          200: '#dddff8',
          300: '#bbbfe8',
          400: '#9298cc',
          500: '#6870a8',
          600: '#474e82',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.375rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        'glow-xs': '0 0 10px 0 rgba(110,102,248,0.22)',
        'glow-sm': '0 0 20px 0 rgba(110,102,248,0.32)',
        'glow':    '0 0 36px 0 rgba(110,102,248,0.38)',
        'glow-lg': '0 0 56px 0 rgba(110,102,248,0.45)',
        'glow-cyan':'0 0 20px 0 rgba(34,211,238,0.35)',
        'glow-good':'0 0 20px 0 rgba(52,211,153,0.35)',
        'card':     '0 1px 3px rgba(0,0,0,0.6), 0 6px 24px rgba(0,0,0,0.35)',
        'card-hover':'0 2px 8px rgba(0,0,0,0.7), 0 14px 40px rgba(0,0,0,0.5)',
        'inner-t':  'inset 0 1px 0 rgba(255,255,255,0.07)',
        'inner':    'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.18s ease-out',
        'slide-up':   'slideUp 0.22s cubic-bezier(0.22,1,0.36,1)',
        'slide-down': 'slideDown 0.18s cubic-bezier(0.22,1,0.36,1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':    'shimmer 1.8s linear infinite',
        'pop':        'pop 0.2s cubic-bezier(0.22,1,0.36,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' },             to: { backgroundPosition: '200% 0' } },
        pop:       { '0%': { transform: 'scale(0.94)', opacity: '0' },    '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      spacing: { '18': '4.5rem' },
    },
  },
  plugins: [],
}
