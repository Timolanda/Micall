module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // blue
        danger: '#ef4444', // red
        background: '#18181b', // dark
        surface: '#27272a',
        accent: '#f1f5f9', // white/gray
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 #ef4444' },
          '50%': { boxShadow: '0 0 16px 8px #ef4444' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio'), require('@tailwindcss/line-clamp')],
}; 