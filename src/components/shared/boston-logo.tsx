import React from "react";
import { cn } from "@/lib/utils";

interface BostonLogoProps {
  className?: string;
  variant?: "light" | "dark" | "burgundy" | "crimson-bg";
  size?: "sm" | "md" | "lg" | "xl" | "hero";
}

/**
 * Boston & Co. — American Eatery Official Brand Mark
 * Handcrafted vector SVG matching the physical restaurant signage:
 * - Rounded stadium badge border
 * - "boston&co." bold lowercase typography
 * - "AMERICAN EATERY" tracked uppercase secondary subhead
 */
export function BostonLogo({
  className,
  variant = "burgundy",
  size = "md",
}: BostonLogoProps) {
  // Dimension sizing presets
  const sizeMap = {
    sm: { width: 140, height: 56, text1: 22, text2: 7.5, stroke: 3.5, rx: 16 },
    md: { width: 200, height: 80, text1: 30, text2: 10, stroke: 4.5, rx: 22 },
    lg: { width: 260, height: 104, text1: 40, text2: 13, stroke: 5.5, rx: 28 },
    xl: { width: 340, height: 136, text1: 52, text2: 17, stroke: 7, rx: 36 },
    hero: { width: 440, height: 176, text1: 68, text2: 22, stroke: 9, rx: 46 },
  };

  const { width, height, text1, text2, stroke, rx } = sizeMap[size];

  // Palette variants
  const colorMap = {
    light: {
      border: "#FAF6F0",
      text: "#FAF6F0",
      subtext: "#FAF6F0",
      bg: "transparent",
    },
    dark: {
      border: "#1E1511",
      text: "#1E1511",
      subtext: "#1E1511",
      bg: "transparent",
    },
    burgundy: {
      border: "#991B1B",
      text: "#991B1B",
      subtext: "#991B1B",
      bg: "transparent",
    },
    "crimson-bg": {
      border: "#FFFFFF",
      text: "#FFFFFF",
      subtext: "#FFFFFF",
      bg: "#B91C1C",
    },
  };

  const colors = colorMap[variant];

  return (
    <svg
      viewBox="0 0 340 136"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none transition-all", className)}
      aria-label="Boston & Co. American Eatery Logo"
    >
      {/* Optional solid crimson background fill if requested */}
      {colors.bg !== "transparent" && (
        <rect
          x="2"
          y="2"
          width="336"
          height="132"
          rx="40"
          fill={colors.bg}
        />
      )}

      {/* Stadium / Rounded Enclosure Border */}
      <rect
        x="8"
        y="8"
        width="324"
        height="120"
        rx="36"
        stroke={colors.border}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Primary Brand Typography: "boston&co." */}
      <text
        x="170"
        y="68"
        textAnchor="middle"
        fill={colors.text}
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="800"
        letterSpacing="-0.03em"
      >
        boston&amp;co.
      </text>

      {/* Subhead Typography: "AMERICAN EATERY" */}
      <text
        x="170"
        y="99"
        textAnchor="middle"
        fill={colors.subtext}
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="14.5"
        fontWeight="800"
        letterSpacing="0.28em"
      >
        AMERICAN EATERY
      </text>
    </svg>
  );
}
