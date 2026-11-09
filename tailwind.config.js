/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        poker: {
          bg: '#0B1220',
          tile: '#172033',
          green: '#22C55E',
          red: '#EF4444',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
      },
    },
  },
  plugins: [],
};
