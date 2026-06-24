/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e7ff',
          300: '#89d8ff',
          400: '#52c0fc',
          500: '#2aa2f8',
          600: '#1484ed',
          700: '#0d6ddb',
          800: '#1158b1',
          900: '#134a8b',
          950: '#0f2f5e',
        },
        surface: {
          900: '#0a0e1a',
          800: '#0f1523',
          700: '#151c2e',
          600: '#1c2540',
          500: '#243052',
        },
      },
    },
  },
  plugins: [],
}
