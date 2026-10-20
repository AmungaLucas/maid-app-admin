import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b"
        },
        // Sidebar / shell chrome
        ink: {
          700: "#1e293b",
          800: "#131c2e",
          850: "#0f1726",
          900: "#0b1220",
          925: "#080e1a",
          950: "#060b14"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)",
        lift: "0 4px 6px -2px rgba(15,23,42,.05), 0 10px 24px -6px rgba(15,23,42,.10)",
        pop: "0 12px 40px -8px rgba(2,6,23,.25), 0 2px 8px -2px rgba(2,6,23,.12)",
        glow: "0 0 0 1px rgba(16,185,129,.25), 0 8px 24px -8px rgba(16,185,129,.35)"
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".55", transform: "scale(.8)" }
        }
      },
      animation: {
        "fade-in": "fade-in .25s ease-out both",
        "scale-in": "scale-in .22s cubic-bezier(.16,1,.3,1) both",
        "slide-in": "slide-in .3s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 1.4s infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
