import type { Config } from "tailwindcss";

/**
 * Brand tokens live in app/globals.css as CSS variables.
 * This config exposes them as Tailwind utilities so you can write
 *   bg-surface-alt, text-ink-soft, border-brand, font-serif, shadow-card, etc.
 * The default Tailwind palette (slate, red, …) is still available.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          mute: "var(--ink-mute)",
        },
        brand: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          accent: "var(--accent)",
          "accent-soft": "var(--accent-soft)",
        },
        success: "var(--success)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        brand: "var(--primary)",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "Fraunces",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,17,22,0.04), 0 6px 18px rgba(14,17,22,0.05)",
        "card-lg":
          "0 2px 4px rgba(14,17,22,0.04), 0 18px 44px rgba(14,17,22,0.08)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
