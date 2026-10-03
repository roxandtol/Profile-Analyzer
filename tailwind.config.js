/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sdvx: {
          dark: '#0a0d14',
          card: '#121722',
          border: '#1f293d',
          accent: '#ff007f', // SDVX magenta/pink
          cyan: '#00f0ff',   // SDVX cyan
          gold: '#ffd700',   // S/PUC gold
          purple: '#9d00ff',
          green: '#00ff88',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
