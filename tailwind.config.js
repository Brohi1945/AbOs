
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0B0D12",
          surface: "#14171F",
        },
        text: {
          primary: "#E8E9ED",
        },
        accent: {
          gold: "#C9A44C",
        },
      },
    },
  },
  plugins: [],
};