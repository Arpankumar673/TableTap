"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BostonLogo } from "./boston-logo";

const STORAGE_KEY = "boston_co_splash_shown";

/**
 * Full-screen Boston & Co. Restaurant Initialization Splash Screen
 * Features:
 * - Session-gated (appears once per session on initialization, never on internal navigation)
 * - Warm ambient restaurant background with subtle dark overlay
 * - Boston & Co. insignia centered prominently with glowing radial aura
 * - Sophisticated golden loading shimmer
 * - Smooth fade-out exit transition
 * - Strictly zero address, promotional, or contact text at the bottom
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if splash screen was already displayed in this browser session
    try {
      const alreadyShown = window.sessionStorage.getItem(STORAGE_KEY);
      if (!alreadyShown) {
        setVisible(true);
        // Automatically fade out after 1.8 seconds
        const timer = setTimeout(() => {
          setVisible(false);
          window.sessionStorage.setItem(STORAGE_KEY, "true");
        }, 1800);
        return () => clearTimeout(timer);
      }
    } catch {
      // In private browsing or storage disabled, do not block
      setVisible(false);
    }
  }, []);

  if (!mounted || !visible) {
    return null;
  }

  function handleDismiss() {
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boston-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#140D0A] cursor-pointer select-none"
        >
          {/* 1. Atmospheric Ambient Background Layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1C120C]/90 via-[#140D0A]/95 to-[#0E0907]" />

          {/* Warm Amber & Burgundy Radial Glow behind Logo */}
          <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#8B1E1E]/30 via-[#D97706]/20 to-transparent blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-[#8B1E1E]/20 blur-[120px]" />

          {/* Subtle American Eatery Heritage Backdrop Texture */}
          <div
            className="absolute inset-0 opacity-[0.04] bg-repeat"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, #FDFBF7 2%, transparent 0%), radial-gradient(circle at 75px 75px, #FDFBF7 2%, transparent 0%)`,
              backgroundSize: "100px 100px",
            }}
          />

          {/* 2. Centered Prominent Brand Mark */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center px-6 text-center"
          >
            <div className="relative p-2">
              {/* Outer soft glow ring */}
              <div className="absolute -inset-4 rounded-[44px] bg-[#D97706]/10 blur-xl" />
              <BostonLogo variant="light" size="lg" className="relative drop-shadow-2xl" />
            </div>

            {/* 3. Sophisticated Shimmering Loading Animation */}
            <div className="mt-10 flex flex-col items-center space-y-3">
              <div className="relative h-1 w-44 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 h-full w-24 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent"
                  animate={{
                    x: [-96, 176],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#EFE6D5]/70"
              >
                Preparing Dining Experience
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
