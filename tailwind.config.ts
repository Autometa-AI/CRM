import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Soft neutrals tuned for a calm data-dense UI (Attio-like)
        canvas: "#FAFAFB",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#0E1116",
          muted: "#5B6573",
          subtle: "#9AA4B2",
        },
        line: "#EAECF0",
        // Primary accent — subtle indigo that reads as serious but human
        brand: {
          50: "#F4F5FF",
          100: "#E8EAFE",
          200: "#CFD2FB",
          300: "#A9ADF5",
          400: "#7F82EC",
          500: "#5C5EDB",
          600: "#4A4CC3",
          700: "#3C3FA1",
          800: "#33347F",
          900: "#2B2C66",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.02)",
        "card-hover": "0 2px 4px rgba(15, 23, 42, 0.06), 0 2px 2px rgba(15, 23, 42, 0.04)",
        pop: "0 8px 24px -6px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.04)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
