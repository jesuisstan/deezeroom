import { vars } from 'nativewind';

export const themes = {
  light: vars({
    '--color-primary': '#000000', // black
    '--color-secondary': 'rgba(0, 0, 0, 0.1)', // gray-500
    '--color-background': '#ffffff', // white
    '--color-text': '#000000', // black text
    '--color-accent': '#a238ff' // black text
  }),
  dark: vars({
    '--color-primary': '#ffffff', // white
    '--color-secondary': 'rgba(255, 255, 255, 0.2)', // gray-400
    '--color-background': '#000000', // black
    '--color-text': '#ffffff', // white text
    '--color-accent': '#ec7f11' // white text
  })
};
