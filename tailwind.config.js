/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        purple: {
          50: '#F6F3FF',
          100: '#EDEAFF',
          200: '#D1C9FF',
          300: '#B6A8FF',
          400: '#9A87FF',
          500: '#8657ED', // Primary purple
          600: '#7046DC',
          700: '#5A35CB',
          800: '#45249A',
          900: '#30136A',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};