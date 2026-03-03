import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        block: {
          blue: "hsl(var(--block-blue))",
          orange: "hsl(var(--block-orange))",
          green: "hsl(var(--block-green))",
          red: "hsl(var(--block-red))",
          purple: "hsl(var(--block-purple))",
          teal: "hsl(var(--block-teal))",
          pink: "hsl(var(--block-pink))",
          yellow: "hsl(var(--block-yellow))",
          indigo: "hsl(var(--block-indigo))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* ── Cosmic palette ── */
        cosmic: {
          cyan:    "#00e5ff",
          blue:    "#2979ff",
          violet:  "#7c3aed",
          magenta: "#e91e8c",
          plasma:  "#00ff88",
          void:    "#06021a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 14px rgba(0,229,255,0.30), 0 0 38px rgba(0,229,255,0.10)",
          },
          "50%": {
            boxShadow: "0 0 26px rgba(0,229,255,0.58), 0 0 68px rgba(0,229,255,0.22)",
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "nebula-shift": {
          "0%, 100%": { opacity: "0.85", filter: "hue-rotate(0deg)" },
          "50%":       { opacity: "1",    filter: "hue-rotate(14deg)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "slide-in-right":  "slide-in-right 0.3s ease-out",
        "fade-in-up":      "fade-in-up 0.4s ease-out",
        "pulse-soft":      "pulse-soft 2s ease-in-out infinite",
        "glow-pulse":      "glow-pulse 2.8s ease-in-out infinite",
        "float":           "float 4s ease-in-out infinite",
        "nebula-shift":    "nebula-shift 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
