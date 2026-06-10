/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f5f0e8',
          100: '#e8dcc5',
          200: '#d4b896',
          300: '#bf9467',
          400: '#a87445',
          500: '#8b5e32',
          600: '#6e4a25',
          700: '#523718',
          800: '#37250e',
          900: '#1c1207',
        },
        leaf: {
          50: '#edf7ee',
          100: '#d1ecd3',
          200: '#a4d8a8',
          300: '#75c37c',
          400: '#47ad55',
          500: '#2d9442',
          600: '#237534',
          700: '#1a5727',
          800: '#103819',
          900: '#081c0c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
