/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        center: true,
        primary: "#fea928",
        secondary: "#ed8900",
      },
    },
  },
  plugins: [],
}