/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        exam: {
          light: '#FEE2E2',
          DEFAULT: '#DC2626',
          dark: '#991B1B'
        },
        def: {
          light: '#FEF3C7',
          DEFAULT: '#D97706',
          dark: '#92400E'
        }
      }
    },
  },
  plugins: [],
}
