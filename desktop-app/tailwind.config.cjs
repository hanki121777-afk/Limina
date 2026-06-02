/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
const defaultColors = require('tailwindcss/colors');

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      ...defaultColors,
      transparent: 'transparent',
      current: 'currentColor',
      black: defaultColors.black,
      white: defaultColors.white,
      zinc: defaultColors.zinc,
      bg: {
        0: '#0a0a0a',
        1: '#0d0d0d',
        card: '#111111',
        'card-2': '#131313',
      },
      cyan: {
        50:  '#f0fdf8',
        100: '#ccfbee',
        200: '#99f6dd',
        300: '#5eedc6',
        400: '#4de8b3',
        500: '#27E0A1',
        600: '#1fba85',
        700: '#178a63',
        800: '#0f5c42',
        900: '#082e21',
        DEFAULT: '#27E0A1',
        dim: 'rgba(39,224,161,0.5)',
        soft: 'rgba(39,224,161,0.08)',
        glow: 'rgba(39,224,161,0.25)',
      },
      border: {
        DEFAULT: 'rgba(255,255,255,0.08)',
        strong: 'rgba(255,255,255,0.14)',
      },
      muted: {
        DEFAULT: 'rgba(255,255,255,0.55)',
        2: 'rgba(255,255,255,0.35)',
        dim: 'rgba(255,255,255,0.18)',
      },
    },
    extend: {
      fontFamily: {
        en: ['Unbounded', 'sans-serif'],
        ko: ['Pretendard', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
