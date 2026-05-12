/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // ── Brand: dark navy + cyan/blue neon ──
        bg:        'hsl(var(--bg))',
        panel:     'hsl(var(--panel))',
        elevated:  'hsl(var(--elevated))',
        border:    'hsl(var(--border))',
        ring:      'hsl(var(--ring))',
        fg:        'hsl(var(--fg))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          fg:      'hsl(var(--muted-fg))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          fg:      'hsl(var(--primary-fg))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg:      'hsl(var(--accent-fg))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger:  'hsl(var(--danger))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'glow-radial': 'radial-gradient(1200px 600px at 20% -10%, hsl(var(--primary)/0.18) 0%, transparent 70%), radial-gradient(900px 500px at 90% 110%, hsl(var(--accent)/0.18) 0%, transparent 70%)',
        'mesh': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow:   '0 0 40px -10px hsl(var(--primary) / 0.5)',
        'glow-accent': '0 0 60px -10px hsl(var(--accent) / 0.55)',
        'card': '0 1px 0 0 hsl(0 0% 100% / 0.04) inset, 0 8px 24px -12px hsl(220 90% 6% / 0.6)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
        'shimmer':  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':  'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'shimmer':  'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
