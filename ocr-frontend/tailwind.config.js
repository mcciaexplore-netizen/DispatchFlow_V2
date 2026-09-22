/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3F6F9',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
        primary: '#0F70B7', // MCCIA Royal Blue
        'primary-hover': '#0C5B96',
        accent: '#23A849',  // MCCIA Green
        'accent-hover': '#1C883B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', '"Barlow Semi Condensed"', 'sans-serif'],
        body: ['"Inter"', '"Source Sans 3"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      minHeight: { touch: '44px' },
      borderRadius: { DEFAULT: '6px', md: '8px', lg: '12px' },
    },
  },
  plugins: [],
}
