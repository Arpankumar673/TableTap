import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        // TableTap — Boston & Co. American Eatery Palette
        burgundy: {
          50: "#FDF2F2",
          100: "#FCE7E7",
          200: "#F9D2D2",
          300: "#F3AEAE",
          400: "#E77878",
          500: "#D63F3F",
          600: "#B91C1C", // Boston & Co. Primary Crimson
          700: "#991B1B",
          800: "#7F1D1D", // Heritage Deep Burgundy
          900: "#5F1414",
          950: "#3D0B0B",
        },
        espresso: {
          50: "#F7F5F3",
          100: "#ECE7E2",
          200: "#DAD0C5",
          300: "#C3B3A2",
          400: "#A6907C",
          500: "#86705D",
          600: "#695546",
          700: "#504035",
          800: "#3A2E27",
          900: "#251E19",
          950: "#16110E", // Dark Smoked Timber
        },
        cream: {
          50: "#FDFBF7", // Primary Warm Cream Surface
          100: "#F8F4EB",
          200: "#EFE6D5", // Warm Cream Borders
          300: "#E3D5BD",
          400: "#CFC0A3",
          500: "#B5A17F",
          600: "#937F5F",
          700: "#716147",
          800: "#4F4332",
          900: "#2E271D",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B", // Warm Amber Accent
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // Backward-compatibility aliases for existing components
        forest: {
          50: "#FDF2F2",
          100: "#FCE7E7",
          200: "#F9D2D2",
          300: "#F3AEAE",
          400: "#E77878",
          500: "#B91C1C",
          600: "#991B1B",
          700: "#7F1D1D",
          800: "#3A2E27",
          900: "#251E19",
          950: "#16110E",
        },
        tomato: {
          50: "#FDF2F2",
          100: "#FCE7E7",
          200: "#FACEC8",
          300: "#F6ABA1",
          400: "#EF7C6E",
          500: "#E2503E",
          600: "#B91C1C",
          700: "#991B1B",
          800: "#7F1D1D",
          900: "#5F1414",
        },
        spice: {
          50: "#FFF8F0",
          100: "#FFEFDB",
          200: "#FFDCB3",
          300: "#FFC280",
          400: "#FFA047",
          500: "#D97706",
          600: "#B45309",
          700: "#92400E",
          800: "#78350F",
          900: "#502409",
        },
        kitchen: {
          dark: "#120E0C",
          card: "#1D1714",
          border: "#332720",
          accent: "#10B981",
          warning: "#F59E0B",
          urgent: "#EF4444",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "sans-serif"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
