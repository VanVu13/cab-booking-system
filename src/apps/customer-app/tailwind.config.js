/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb", // Blue-600
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f1f5f9", // Slate-100
          foreground: "#0f172a", // Slate-900
        },
        destructive: {
          DEFAULT: "#ef4444", // Red-500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f8fafc", // Slate-50
          foreground: "#64748b", // Slate-500
        },
        accent: {
          DEFAULT: "#f1f5f9", // Slate-100
          foreground: "#0f172a", // Slate-900
        },
      },
    },
  },
  plugins: [],
}
