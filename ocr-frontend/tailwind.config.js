/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F1EC',
        surface: '#FDFCF9',
        border: '#DDD8CF',
        text: '#1E1B17',
        muted: '#706A62',
        primary: '#2C2824',
        accent: '#E07B00',
        success: '#2D7A4F',
        warning: '#C4780A',
        danger: '#B83232',
      },
      fontFamily: {
        heading: ['"Barlow Semi Condensed"', 'sans-serif'],
        body: ['"Source Sans 3"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      minHeight: { touch: '44px' },
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px' },
    },
  },
  plugins: [],
}
