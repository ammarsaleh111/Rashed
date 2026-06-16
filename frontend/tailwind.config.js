/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: '#5eff33', // Rashed brand neon green
        dark: {
          bg: '#0a0a0a',
          panel: '#0f0f0f',
          input: '#1a1a1a',
          border: '#2a2a2a',
        },
        brand: {
          50: '#f7f6f2',
          100: '#ece7da',
          200: '#d8cdb3',
          300: '#c3b18d',
          400: '#ae9567',
          500: '#91784a',
          600: '#755f39',
          700: '#594729',
          800: '#3d301a',
          900: '#221a0c',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
