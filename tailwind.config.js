/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: {
          main: '#a238ff',
          strong: '#9333e8',
          weak: '#c17aff'
        },
        text: {
          main: '#fdfcfe',
          secondary: '#a9a6aa',
          disabled: '#555257',
          inverse: '#000'
        },
        bg: {
          main: '#0f0d13',
          secondary: '#1b191f',
          tertiary: '#29282d',
          'tertiary-hover': '#3a393d',
          transparent: '#0000004d'
        },
        tint: {
          light: '#0a7ea4',
          dark: '#fff'
        },
        icon: {
          light: '#687076',
          dark: '#9BA1A6'
        }
      }
    }
  },
  plugins: []
};
