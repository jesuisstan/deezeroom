import { vars } from 'nativewind';

// Purpose of this module
// - Provide a single source of truth for color tokens (BASE)
// - Expose runtime palette (themeColors) for places where Tailwind classes cannot be used
//   e.g. React Navigation options, ActivityIndicator color, inline styles
// - Expose NativeWind vars (themes) to inject CSS custom properties for class-based styling
//   so classes like `text-[--color-text]` or mapped tokens can resolve per theme
//
// Why both themeColors and themes?
// - themeColors: plain JS object with concrete hex values for programmatic props
// - themes: result of nativewind `vars(...)` that sets CSS variables (Web) / style vars (Native)
//   consumed by className utilities and View style={themes[theme]}
//
// Important:
// - Both exports are derived from BASE to avoid duplication and drift
// - darkMode is set to 'class' in tailwind.config.js; on Web we set StyleSheet.setFlag('darkMode','class')
//   in the ThemeProvider to allow manual toggling

// COLOR VARIABLES
// Base tokens by theme. Update these values to change the palette globally.
const BASE = {
  light: {
    black: '#0f0d13',
    white: '#fdfcfe',
    primary: '#a238ff',
    accent: '#7328b5',
    'text-main': '#0f0d13',
    'text-secondary': '#6f6d71',
    'text-disabled': '#a9a6aa',
    'text-inverse': '#fdfcfe',
    'bg-main': '#fdfcfe',
    'bg-secondary': '#f5f2f8',
    'bg-tertiary': '#e1dde4',
    'bg-tertiary-hover': '#d1ced3',
    'bg-inverse': '#0f0d13',
    disabled: '#c2c0c4',
    border: '#c2c0c4',
    'intent-error': '#df3c3c',
    'intent-warning': '#ec7f11',
    'intent-success': '#00babc'
  },
  dark: {
    black: '#0f0d13',
    white: '#fdfcfe',
    primary: '#a238ff',
    accent: '#7328b5',
    'text-main': '#fdfcfe',
    'text-secondary': '#eae8ec',
    'text-disabled': '#555257',
    'text-inverse': '#0f0d13',
    'bg-main': '#0f0d13',
    'bg-secondary': '#1b191f',
    'bg-tertiary': '#29282d',
    'bg-tertiary-hover': '#3a393d',
    'bg-inverse': '#fdfcfe',
    disabled: '#555257',
    border: '#555257',
    'intent-error': '#df3c3c',
    'intent-warning': '#ec7f11',
    'intent-success': '#00babc'
  }
} as const;

// THEME COLORS
// Runtime palette for JS-only props (cannot accept className), e.g. tabBarActiveTintColor
export const themeColors = {
  light: BASE.light,
  dark: BASE.dark
} as const;

// THEMES
// CSS/style variables for NativeWind. Apply with <View style={themes[currentTheme]}> at app root
export const themes = {
  light: vars({
    '--color-black': BASE.light.black,
    '--color-white': BASE.light.white,
    '--color-primary': BASE.light.primary,
    '--color-accent': BASE.light.accent,
    '--color-text-main': BASE.light['text-main'],
    '--color-text-secondary': BASE.light['text-secondary'],
    '--color-text-disabled': BASE.light['text-disabled'],
    '--color-text-inverse': BASE.light['text-inverse'],
    '--color-bg-main': BASE.light['bg-main'],
    '--color-bg-secondary': BASE.light['bg-secondary'],
    '--color-bg-tertiary': BASE.light['bg-tertiary'],
    '--color-bg-tertiary-hover': BASE.light['bg-tertiary-hover'],
    '--color-bg-inverse': BASE.light['bg-inverse'],
    '--color-disabled': BASE.light.disabled,
    '--color-border': BASE.light.border,
    '--color-intent-error': BASE.light['intent-error'],
    '--color-intent-warning': BASE.light['intent-warning'],
    '--color-intent-success': BASE.light['intent-success']
  }),
  dark: vars({
    '--color-black': BASE.dark.black,
    '--color-white': BASE.dark.white,
    '--color-primary': BASE.dark.primary,
    '--color-accent': BASE.dark.accent,
    '--color-text-main': BASE.dark['text-main'],
    '--color-text-secondary': BASE.dark['text-secondary'],
    '--color-text-disabled': BASE.dark['text-disabled'],
    '--color-text-inverse': BASE.dark['text-inverse'],
    '--color-bg-main': BASE.dark['bg-main'],
    '--color-bg-secondary': BASE.dark['bg-secondary'],
    '--color-bg-tertiary': BASE.dark['bg-tertiary'],
    '--color-bg-tertiary-hover': BASE.dark['bg-tertiary-hover'],
    '--color-bg-inverse': BASE.dark['bg-inverse'],
    '--color-disabled': BASE.dark.disabled,
    '--color-border': BASE.dark.border,
    '--color-intent-error': BASE.dark['intent-error'],
    '--color-intent-warning': BASE.dark['intent-warning'],
    '--color-intent-success': BASE.dark['intent-success']
  })
} as const;
