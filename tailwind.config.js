/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
        inter: ['Inter', 'Arial', 'sans-serif'],
        'league-gothic': ['LeagueGothic', 'Arial Black', 'sans-serif']
      },
      colors: {
        // Primary colors (Deezer brand)
        primary: {
          main: '#a238ff', // Deezer purple
          hover: '#7328b5', // Darker purple on hover
          pressed: '#7328b5', // Pressed state
          light: '#c17aff', // Light purple
          disabled: '#e1dde4' // Disabled state
        },

        // Text colors
        text: {
          primary: '#0f0d13', // Main text (dark theme)
          secondary: '#6f6d71', // Secondary text
          disabled: '#6f6d71', // Disabled text
          inverse: '#ffffff', // Light text on dark bg
          accent: '#fdfbff' // Text on accent background
        },

        // Background colors
        bg: {
          main: '#0f0d13', // Main background (dark)
          secondary: '#1b191f', // Secondary background
          tertiary: '#464549', // Tertiary background
          light: '#ffffff', // Light background
          'tertiary-hover': '#eae8ec', // Hover state
          contrast: '#eae8ec' // Contrast background
        },

        // Border colors
        border: {
          primary: '#c2c0c4', // Main borders
          hover: '#b4b1b6', // Hover state
          accent: '#a238ff' // Accent borders
        },

        // Intent colors
        intent: {
          error: '#df3c3c', // Error states
          warning: '#ec7f11', // Warning states
          success: '#00b23d' // Success states
        },

        // Dark theme counterparts (use with `dark:` variant)
        'text-dark': {
          primary: '#fdfcfe',
          secondary: '#a9a6aa',
          disabled: '#555257',
          inverse: '#000000',
          accent: '#a238ff'
        },
        'bg-dark': {
          main: '#0f0d13',
          secondary: '#1b191f',
          tertiary: '#29282d',
          light: '#191922',
          'tertiary-hover': '#3a393d',
          contrast: '#222228'
        },
        'border-dark': {
          primary: '#52525d',
          hover: '#626270',
          accent: '#a238ff'
        },
        'intent-dark': {
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#22c55e'
        },

        // Neutral colors
        neutral: {
          50: '#f8f8f9',
          100: '#f4f4f4',
          200: '#eaeaea',
          300: '#d1d1d6',
          400: '#a2a2ad',
          500: '#52525d',
          600: '#32323d',
          700: '#23232d',
          800: '#191922',
          900: '#121216'
        }
      },

      // Font sizes (Deezer scale)
      fontSize: {
        '2xs': '0.625rem', // 10px
        xs: '0.75rem', // 12px
        s: '0.875rem', // 14px
        m: '1rem', // 16px
        l: '1.125rem', // 18px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem', // 48px
        '6xl': '3.75rem' // 60px
      },

      // Letter spacing (Deezer style)
      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em'
      }
    }
  },
  plugins: []
};
