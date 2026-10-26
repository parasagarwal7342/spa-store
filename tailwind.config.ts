import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#14161b', soft: '#3a3f4b', muted: '#6b7280' },
        brand: { 50: '#fff8e6', 100: '#ffefc2', 400: '#f7c241', 500: '#f2b01e', 600: '#d9940a', 700: '#a96f06' },
        sand: '#f7f5f0',
        line: '#e7e4dc',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
