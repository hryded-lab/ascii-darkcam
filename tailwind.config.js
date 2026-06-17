export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Instrument Serif'", "Georgia", "serif"],
        sans: ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
      colors: {
        paper: "#ece4d3",
        paper2: "#f4efe3",
        ink: "#19140f",
        "ink-soft": "#54493c",
        taupe: "#9a8e7b",
        line: "#d4c9b4",
        plate: "#100d08",
        safelight: "#ff4a1c",
        ember: "#d83a12",
      },
      letterSpacing: {
        masthead: "-0.03em",
      },
      boxShadow: {
        plate:
          "0 1px 0 rgba(255,255,255,0.5), 0 24px 50px -20px rgba(25,20,15,0.55), inset 0 0 0 1px rgba(25,20,15,0.06)",
        tray: "0 -18px 40px -24px rgba(25,20,15,0.45)",
      },
    },
  },
  plugins: [],
};
