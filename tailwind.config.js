/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#16A34A',      // vert Brumerie
        secondary: '#22C55E',    // vert clair
        accent: '#BBF7D0',       // vert très clair
        dark: '#0F0F0F',
        surface: '#FFFFFF',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 20px rgba(0,0,0,0.06)',
        'green': '0 4px 20px rgba(22, 163, 74, 0.30)',
      },
    },
  },
  plugins: [],
}
