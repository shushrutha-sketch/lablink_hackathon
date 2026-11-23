/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bbdcfe',
          300: '#8cc5fd',
          400: '#56a3fa',
          500: '#2b7ef5',
          600: '#1a60e8',
          700: '#144bcb',
          800: '#163fa4',
          900: '#173782',
          950: '#0f2250',
        },
      },
    },
  },
  plugins: [],
}
