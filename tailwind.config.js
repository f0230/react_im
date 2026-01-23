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
        'inter': ['Inter', 'sans-serif'],
        'product': ['ProductSans', 'sans-serif'],

      },
      colors: {
        'teal-light': '#dbfdff',
        'teal-medium': '#6ea0a0',
        'teal-dark': '#3a7c7c',
        
        'greyburger': '#d9d9d9',
        'skyblue': '#0071E3',
        'green': '#47D065',
        'crem': '#ACACAC',
        'skysoft': '#AEE4F8',

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
        // --- AÑADIDO: Keyframes para Ken Burns ---
        kenburns: {
            '0%': { 
              transform: 'scale(1) translate(0, 0)', 
              filter: 'blur(0px)' // Opcional: Inicia nítido
            }, 
            '100%': { 
              transform: 'scale(1.1) translate(-10px, 5px)', // Ajusta escala y movimiento
              filter: 'blur(1px)' // Opcional: Ligero desenfoque al final
            }, 
        },
      },
      animation: {
        'slide-up': 'slide-up 1s ease-out',
        'fade-in': 'fade-in 1s ease-out',
                  'spin-slow': 'spin 20s linear infinite',
        // --- AÑADIDO: Definición de la animación Ken Burns ---
        // 'kenburns 20s ease-in-out infinite alternate' significa:
        // - Usa los keyframes 'kenburns'
        // - Dura 20 segundos
        // - Con aceleración 'ease-in-out'
        // - Se repite infinitamente ('infinite')
        // - Alterna la dirección en cada ciclo ('alternate')
        'kenburns': 'kenburns 20s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],

  
}




