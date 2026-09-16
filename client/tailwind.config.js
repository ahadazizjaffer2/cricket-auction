/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        pitch: {
          bg: "#0F1B14",
          surface: "#16241C",
          line: "#26382C",
        },
        grass: "#4C8C4A",
        ball: "#B23A2E",
        gold: "#D6A94B",
        cream: "#F3EFE3",
      },
      fontFamily: {
        display: ["'Teko'", "sans-serif"],
        body: ["'Karla'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
