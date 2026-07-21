/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        danger: '#DC2626',
        warning: '#D97706',
        safe: '#16A34A',
        night: '#0F172A',
        surface: '#1E293B',
        'border-custom': '#334155',
        'text-primary': '#F1F5F9',
        muted: '#94A3B8',
        accent: '#3B82F6',
        'orange-brand': '#F97316',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'section': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'btn': ['16px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        'touch': '48px',
        'touch-lg': '56px',
        'cta': '60px',
        'switch': '80px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-red': 'flashRed 0.5s ease-in-out infinite',
        'gauge-fill': 'gaugeFill 1.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'mic-pulse': 'micPulse 1.5s ease-in-out infinite',
        'ring-countdown': 'ringCountdown linear forwards',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        flashRed: {
          '0%, 100%': { backgroundColor: '#DC2626' },
          '50%': { backgroundColor: '#7F1D1D' },
        },
        gaugeFill: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--gauge-target)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        micPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
          '50%': { boxShadow: '0 0 0 16px rgba(59, 130, 246, 0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ringCountdown: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '283' },
        },
      },
    },
  },
  plugins: [],
}
