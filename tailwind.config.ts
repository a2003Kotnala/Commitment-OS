import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1B3A5C",
          foreground: "#F8FAFC"
        },
        accent: {
          DEFAULT: "#2E86AB",
          foreground: "#F8FAFC"
        },
        success: "#27AE60",
        warning: "#E67E22",
        danger: "#C0392B",
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
