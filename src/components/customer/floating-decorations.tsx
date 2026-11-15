"use client";

import React from "react";

export function FloatingHeroDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
    >
      {/* Floating Artisan Burger Outline - Top Right */}
      <div className="absolute -top-3 right-4 sm:top-4 sm:right-12 animate-float-slow opacity-25 text-gold-400">
        <svg
          width="48"
          height="48"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-sm"
        >
          {/* Top Bun */}
          <path d="M12 28C12 17 21 11 32 11C43 11 52 17 52 28H12Z" />
          {/* Seeds */}
          <circle cx="24" cy="18" r="1" fill="currentColor" />
          <circle cx="32" cy="16" r="1" fill="currentColor" />
          <circle cx="40" cy="19" r="1" fill="currentColor" />
          {/* Cheese / Lettuce wave */}
          <path d="M10 33C14 31 17 35 22 33C27 31 31 35 36 33C41 31 45 35 50 33C52 32 54 33 54 33" />
          {/* Patty */}
          <rect x="11" y="38" width="42" height="7" rx="3.5" />
          {/* Bottom Bun */}
          <path d="M14 49H50C50 53 45 56 32 56C19 56 14 53 14 49Z" />
        </svg>
      </div>

      {/* Floating Sourdough Pizza Slice - Bottom Left */}
      <div className="hidden sm:block absolute bottom-3 left-6 sm:bottom-6 sm:left-10 animate-float-reverse opacity-20 text-cream-200">
        <svg
          width="42"
          height="42"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 sm:h-10 sm:w-10 drop-shadow-sm"
        >
          {/* Pizza Slice Crust & Body */}
          <path d="M14 20C24 16 40 16 50 20L32 54L14 20Z" />
          {/* Crust Arch */}
          <path d="M12 20C23 15 41 15 52 20" />
          {/* Pepperoni / Toppings */}
          <circle cx="28" cy="27" r="2.5" fill="currentColor" opacity="0.6" />
          <circle cx="36" cy="33" r="2.5" fill="currentColor" opacity="0.6" />
          <circle cx="30" cy="40" r="2" fill="currentColor" opacity="0.6" />
        </svg>
      </div>

      {/* Subtle Gold Sparkle Accent 1 - Top Center */}
      <div className="absolute top-6 left-1/3 animate-pulse-subtle opacity-35 text-gold-400">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm"
        >
          <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
        </svg>
      </div>

      {/* Subtle Gold Sparkle Accent 2 - Lower Right */}
      <div className="absolute bottom-4 right-1/4 animate-pulse-subtle opacity-30 text-gold-300">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5 sm:h-4 sm:w-4 drop-shadow-sm"
        >
          <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
        </svg>
      </div>
    </div>
  );
}

export function FloatingSectionDivider() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex items-center justify-center gap-3 py-2 opacity-30 select-none text-gold-600"
    >
      <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-gold-400" />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z" />
      </svg>
      <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-gold-400" />
    </div>
  );
}
