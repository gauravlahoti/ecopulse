import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'space-black': '#05080F',
        'space-deep': '#080C17',
        'space-surface': '#0D1526',
        'space-border': 'rgba(255, 255, 255, 0.07)',

        // Primary accent — Clean Energy Cyan
        'neon-cyan': '#00F5D4',
        'neon-cyan-muted': 'rgba(0, 245, 212, 0.12)',

        // Secondary accent — AI Purple
        'neon-purple': '#7B61FF',
        'neon-purple-muted': 'rgba(123, 97, 255, 0.12)',

        // Carbon severity scale
        'carbon-low': '#00C896',
        'carbon-mid': '#FFB800',
        'carbon-high': '#FF6B35',
        'carbon-critical': '#FF2D55',

        // Text
        'text-primary': '#E8EDF5',
        'text-secondary': '#8892A4',
        'text-muted': '#4A5568',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      fontSize: {
        'carbon-hero': ['72px', { lineHeight: '1', fontWeight: '800' }],
        'carbon-display': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'carbon-label': ['11px', { lineHeight: '1', letterSpacing: '0.15em' }],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 245, 212, 0.4)',
        'neon-cyan-lg': '0 0 40px rgba(0, 245, 212, 0.3), 0 0 80px rgba(0, 245, 212, 0.1)',
        'neon-purple': '0 0 20px rgba(123, 97, 255, 0.4)',
        'glass': '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 8px 48px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'carbon-gradient': 'linear-gradient(135deg, #00C896, #FFB800, #FF6B35, #FF2D55)',
        'neon-gradient': 'linear-gradient(135deg, #00F5D4, #7B61FF)',
      },
      animation: {
        'scan': 'scan 1.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'count-up': 'count-up 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-up': 'fade-up 0.4s ease-out',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(0)', opacity: '0.8' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 212, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 212, 0.8)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        glass: '24px',
      },
      borderRadius: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}

export default config
