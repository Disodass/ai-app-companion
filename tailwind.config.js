/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C27A3A',
          secondary: '#9F5E2B',
          accent: '#D19A66',
          light: '#F5DEB3',
          dark: '#654321',
        },
      },
      boxShadow: {
        'theme-primary': '0 4px 16px var(--shadow-primary)',
        'theme-secondary': '0 8px 32px var(--shadow-secondary)',
      },
    },
  },
  plugins: [],
};
