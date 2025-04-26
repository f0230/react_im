/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'teal-light': '#dbfdff',
        'teal-medium': '#6ea0a0',
        'teal-dark': '#3a7c7c',
      }
    },
  },
  plugins: [],
}