/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],

  theme: {
    extend: {
      colors: {
        navy: "#0b1930",
        brand: "#1677ff",
        cyan: "#22d3ee",
      },
    },
  },

  plugins: [],
};