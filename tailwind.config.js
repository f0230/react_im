/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '10px': '10px',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        product: ['ProductSans', 'sans-serif'],
      },
      colors: {
        'teal-light': '#dbfdff',
        'teal-medium': '#6ea0a0',
        'teal-dark': '#3a7c7c',
        'greyburger': '#d9d9d9',
        'skyblue': '#0071E3',
        'green': '#0DD122',
        'crem': '#ACACAC',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kenburns: {
          '0%': {
            transform: 'scale(1) translate(0, 0)',
            filter: 'blur(0px)',
          },
          '100%': {
            transform: 'scale(1.1) translate(-10px, 5px)',
            filter: 'blur(1px)',
          },
        },
        auroraMotion: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        auroraTransform: {
          '0%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(-15%, -10%) scale(1.15)' },
          '100%': { transform: 'translate(0%, 0%) scale(1)' },
        },

        auroraBreath: {
          '0%, 100%': {
            transform: 'scale(1) translateY(0px)',
            filter: 'blur(20px)',
          },
          '50%': {
            transform: 'scale(1.2) translateY(-40px)',
            filter: 'blur(8px)',
          },
        }

      },
      animation: {
        'slide-up': 'slide-up 1s ease-out',
        'fade-in': 'fade-in 1s ease-out',
        'spin-slow': 'spin 20s linear infinite',
        kenburns: 'kenburns 20s ease-in-out infinite alternate',
        auroraMotion: 'auroraMotion 12s ease-in-out infinite',
        auroraTransform: 'auroraTransform 20s ease-in-out infinite',
        auroraBreath: 'auroraBreath 12s ease-in-out infinite',


      },
    },
  },
  plugins: [],
};
