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
        'league-gothic': ['LeagueGothic', 'Arial Black', 'sans-serif']
      },
      colors: {
        black: 'var(--color-black)',
        white: 'var(--color-white)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        'background-secondary': 'var(--color-background-secondary)',
        'background-tertiary': 'var(--color-background-tertiary)',
        text: 'var(--color-text)',
        disabled: 'var(--color-disabled)',
        border: 'var(--color-border)',
        'border-hovered': 'var(--color-border-hovered)',
        divider: 'var(--color-divider)',
        'intent-error': 'var(--color-intent-error)',
        'intent-warning': 'var(--color-intent-warning)',
        'intent-success': 'var(--color-intent-success)'
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
