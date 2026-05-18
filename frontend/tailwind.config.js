/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        yes: "#22c55e",
        no: "#ef4444",
      },
    },
  },
  plugins: [],
};
