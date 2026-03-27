import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    borderRadius: {
      none: "0",
      sm: "0.125rem",
      DEFAULT: "0.125rem",
      md: "0.25rem",
      lg: "0.25rem",
      xl: "0.5rem",
      "2xl": "0.75rem",
      "3xl": "1rem",
      full: "9999px",
    },
    extend: {
      colors: {
        // All values use CSS variables so both light + dark themes work,
        // including opacity modifiers like bg-primary/10, border-outline/20, etc.
        "surface":                    "rgb(var(--color-surface) / <alpha-value>)",
        "surface-dim":                "rgb(var(--color-surface-dim) / <alpha-value>)",
        "surface-bright":             "rgb(var(--color-surface-bright) / <alpha-value>)",
        "surface-container-lowest":   "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
        "surface-container-low":      "rgb(var(--color-surface-container-low) / <alpha-value>)",
        "surface-container":          "rgb(var(--color-surface-container) / <alpha-value>)",
        "surface-container-high":     "rgb(var(--color-surface-container-high) / <alpha-value>)",
        "surface-container-highest":  "rgb(var(--color-surface-container-highest) / <alpha-value>)",
        "on-surface":                 "rgb(var(--color-on-surface) / <alpha-value>)",
        "on-surface-variant":         "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        "outline":                    "rgb(var(--color-outline) / <alpha-value>)",
        "outline-variant":            "rgb(var(--color-outline-variant) / <alpha-value>)",
        "primary":                    "rgb(var(--color-primary) / <alpha-value>)",
        "primary-dim":                "rgb(var(--color-primary-dim) / <alpha-value>)",
        "primary-container":          "rgb(var(--color-primary-container) / <alpha-value>)",
        "on-primary":                 "rgb(var(--color-on-primary) / <alpha-value>)",
        "on-primary-container":       "rgb(var(--color-on-primary-container) / <alpha-value>)",
        "secondary":                  "rgb(var(--color-secondary) / <alpha-value>)",
        "secondary-dim":              "rgb(var(--color-secondary-dim) / <alpha-value>)",
        "on-secondary":               "rgb(var(--color-on-secondary) / <alpha-value>)",
        "tertiary":                   "rgb(var(--color-tertiary) / <alpha-value>)",
        "on-tertiary":                "rgb(var(--color-on-tertiary) / <alpha-value>)",
        "error":                      "rgb(var(--color-error) / <alpha-value>)",
        "on-error":                   "rgb(var(--color-on-error) / <alpha-value>)",
        "inverse-surface":            "rgb(var(--color-inverse-surface) / <alpha-value>)",
        "inverse-on-surface":         "rgb(var(--color-inverse-on-surface) / <alpha-value>)",
        "inverse-primary":            "rgb(var(--color-inverse-primary) / <alpha-value>)",
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        label: ["var(--font-inter)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
