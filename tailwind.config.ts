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
        // TableTap Editorial Culinary Palette
        cream: {
          50: "#FCFBF7",
          100: "#F7F3EA",
          200: "#EFE7D5",
          300: "#E2D5BC",
          400: "#CBB691",
          500: "#B29769",
          600: "#8E754E",
          700: "#6C583A",
          800: "#4D3E29",
          900: "#31271A",
        },
        forest: {
          50: "#F0F7F3",
          100: "#DCEEE3",
          200: "#BCDFC9",
          300: "#92C9A6",
          400: "#60AB7E",
          500: "#3D8D5D",
          600: "#2B7048",
          700: "#22593B",
          800: "#1B472F",
          900: "#143725",
          950: "#0B2116",
        },
        tomato: {
          50: "#FDF3F2",
          100: "#FCE5E2",
          200: "#FACEC8",
          300: "#F6ABA1",
          400: "#EF7C6E",
          500: "#E2503E",
          600: "#CD3724",
          700: "#AC2B1B",
          800: "#8E261A",
          900: "#75241B",
        },
        spice: {
          50: "#FFF8F0",
          100: "#FFEFDB",
          200: "#FFDCB3",
          300: "#FFC280",
          400: "#FFA047",
          500: "#F58220",
          600: "#DB6811",
          700: "#B44D0F",
          800: "#903D14",
          900: "#763314",
        },
        kitchen: {
          dark: "#0F1412",
          card: "#18201C",
          border: "#26352E",
          accent: "#22C55E",
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
