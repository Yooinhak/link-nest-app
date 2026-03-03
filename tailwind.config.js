const nativewind = require('nativewind/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        'primary-dark': '#6D28D9',
        destructive: '#EF4444',
        'muted-foreground': '#64748B',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
};
