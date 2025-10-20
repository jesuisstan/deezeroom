/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
        inter: ['Inter', 'Arial', 'sans-serif'],
        'league-gothic': ['LeagueGothic', 'Arial Black', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'Arial', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'Arial', 'sans-serif'],
        'inter-italic': ['Inter-Italic', 'Arial', 'sans-serif']
      },
      colors: {
        black: 'var(--color-black)',
        white: 'var(--color-white)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-disabled': 'var(--color-text-disabled)',
        'text-inverse': 'var(--color-text-inverse)',
        'bg-main': 'var(--color-bg-main)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-tertiary-hover': 'var(--color-bg-tertiary-hover)',
        'bg-inverse': 'var(--color-bg-inverse)',
        disabled: 'var(--color-disabled)',
        border: 'var(--color-border)',
        'intent-error': 'var(--color-intent-error)',
        'intent-warning': 'var(--color-intent-warning)',
        'intent-success': 'var(--color-intent-success)',
        transparent: 'var(--color-transparent)'
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
      },

      // Border radius (ensure all standard sizes are available)
      borderRadius: {
        none: '0px',
        sm: '0.125rem', // 2px
        DEFAULT: '0.25rem', // 4px
        md: '0.375rem', // 6px
        lg: '0.5rem', // 8px
        xl: '0.75rem', // 12px
        '2xl': '1rem', // 16px
        '3xl': '1.5rem', // 24px
        full: '9999px'
      }
    }
  },
  plugins: []
};
