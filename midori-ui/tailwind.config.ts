import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080c0a",
        bg2: "#0d1410",
        bg3: "#111a14",
        bg4: "#151f18",
        green: "#00e676",
        "green-dim": "rgba(0,230,118,0.12)",
        "green-border": "rgba(0,230,118,0.22)",
        "green-glow": "rgba(0,230,118,0.06)",
        surface: "rgba(255,255,255,0.032)",
        "surface-hover": "rgba(255,255,255,0.055)",
        border: "rgba(255,255,255,0.07)",
        "border-hover": "rgba(255,255,255,0.13)",
        text2: "#a8bfad",
        muted: "#6b7f72",
        muted2: "#3d4f42",
        "red-dim": "rgba(255,77,77,0.12)",
        "yellow-dim": "rgba(255,193,7,0.12)"
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition: "800px 0" }
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        livePulse: {
          "0%,100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 rgba(0,230,118,0.6)"
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 0 5px rgba(0,230,118,0)"
          }
        },
        typingBounce: {
          "0%,60%,100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-6px)" }
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "fade-up": "fadeUp 0.6s ease both",
        "live-pulse": "livePulse 2s infinite",
        "typing-bounce": "typingBounce 1.2s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: []
};

export default config;

