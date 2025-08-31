/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const accentMain = '#a238ff';
const accentStrong = '#9333e8';
const accentWeak = '#c17aff';

const textMain = '#fdfcfe';
const textSecondary = '#a9a6aa';
const textDisabled = '#555257';
const textInverse = '#000';

const bgMain = '#0f0d13';
const bgSecondary = '#1b191f';
const bgTertiary = '#29282d';
const bgTertiaryHover = '#3a393d';
const bgTtransparent = '#0000004d';

export const Colors = {
  light: {
    text: '#fdfcfe',
    background: '#0f0d13',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    accentMain: '#a238ff',
    accentStrong: '#9333e8',
    accentWeak: '#c17aff',
    bgTtransparent: '#0000004d'
  },
  dark: {
    text: '#0f0d13',
    background: '#fdfcfe',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    accentMain: '#a238ff',
    accentStrong: '#9333e8',
    accentWeak: '#c17aff',
    bgTtransparent: '#0000004d'
  }
};
