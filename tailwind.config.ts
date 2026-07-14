import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#050510",
        "base-2": "#0a0a1a",
        "base-3": "#111122",
        foreground: "#e0e8ff",
        dim: "#8899aa",
        subtle: "#556677",
        muted: "#334455",
        accent: "#00f0ff",
        "accent-secondary": "#ff00a0",
        "accent-tertiary": "#b829dd",
        success: "#00ff88",
        danger: "#ff3366",
        warning: "#ffcc00",
        border: "#1a1a3a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "'PingFang SC'",
          "'Hiragino Sans GB'",
          "sans-serif",
        ],
        mono: ["'SF Mono'", "'Fira Code'", "monospace"],
      },
      animation: {
        "border-glow": "borderGlow 3s ease-in-out infinite",
        "fade-in": "fadeIn 250ms ease-out",
      },
      keyframes: {
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(0, 240, 255, 0.2)" },
          "50%": { borderColor: "rgba(0, 240, 255, 0.4)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}

export default config
