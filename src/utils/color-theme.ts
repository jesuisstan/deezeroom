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
    text: '#0f0d13',
    secondary: '#1b191f',
    background: '#fdfcfe',
    backgroundSecondary: '#eae8ec',
    backgroundTertiary: '#e1dde4',
    disabled: '#555257',
    border: '#c2c0c4',
    borderHovered: '#b4b1b6',
    divider: '#555257',
    intentError: '#df3c3c',
    intentWarning: '#ec7f11',
    intentSuccess: '#00babc'
  },
  dark: {
    black: '#0f0d13',
    white: '#fdfcfe',
    primary: '#a238ff',
    accent: '#7328b5',
    text: '#fdfcfe',
    secondary: '#eae8ec',
    background: '#0f0d13',
    backgroundSecondary: '#29282d',
    backgroundTertiary: '#464549',
    disabled: '#555257',
    border: '#c2c0c4',
    borderHovered: '#b4b1b6',
    divider: '#555257',
    intentError: '#df3c3c',
    intentWarning: '#ec7f11',
    intentSuccess: '#00babc'
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
    '--color-secondary': BASE.light.secondary,
    '--color-background': BASE.light.background,
    '--color-background-secondary': BASE.light.backgroundSecondary,
    '--color-background-tertiary': BASE.light.backgroundTertiary,
    '--color-text': BASE.light.text,
    '--color-accent': BASE.light.accent,
    '--color-disabled': BASE.light.disabled,
    '--color-border': BASE.light.border,
    '--color-border-hovered': BASE.light.borderHovered,
    '--color-divider': BASE.light.divider,
    '--color-intent-error': BASE.light.intentError,
    '--color-intent-warning': BASE.light.intentWarning,
    '--color-intent-success': BASE.light.intentSuccess
  }),
  dark: vars({
    '--color-black': BASE.dark.black,
    '--color-white': BASE.dark.white,
    '--color-primary': BASE.dark.primary,
    '--color-secondary': BASE.dark.secondary,
    '--color-background': BASE.dark.background,
    '--color-background-secondary': BASE.dark.backgroundSecondary,
    '--color-background-tertiary': BASE.dark.backgroundTertiary,
    '--color-text': BASE.dark.text,
    '--color-accent': BASE.dark.accent,
    '--color-disabled': BASE.dark.disabled,
    '--color-border': BASE.dark.border,
    '--color-border-hovered': BASE.dark.borderHovered,
    '--color-divider': BASE.dark.divider,
    '--color-intent-error': BASE.dark.intentError,
    '--color-intent-warning': BASE.dark.intentWarning,
    '--color-intent-success': BASE.dark.intentSuccess
  })
} as const;
