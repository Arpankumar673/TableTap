"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Smartphone,
  Flame,
  Volume2,
  DollarSign,
  TrendingUp,
  FileText,
  Database,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BostonLogo } from "@/components/shared/boston-logo";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"customer" | "kitchen" | "admin">(
    "customer"
  );

  return (
    <div className="flex min-h-screen flex-col bg-cream-50 text-forest-950">
      {/* 1. NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <BostonLogo variant="burgundy" size="sm" className="h-10 w-auto" />
            <div className="hidden sm:block border-l border-cream-300 pl-3">
              <span className="font-serif text-xs font-bold tracking-wider uppercase text-burgundy-800">
                Operating System
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => setActiveTab("customer")}
              className={`text-sm font-medium transition-colors hover:text-burgundy-800 ${
                activeTab === "customer"
                  ? "font-semibold text-burgundy-900 underline underline-offset-8 decoration-burgundy-700"
                  : "text-espresso-700/80"
              }`}
            >
              Customer QR Menu
            </button>
            <button
              onClick={() => setActiveTab("kitchen")}
              className={`text-sm font-medium transition-colors hover:text-burgundy-800 ${
                activeTab === "kitchen"
                  ? "font-semibold text-burgundy-900 underline underline-offset-8 decoration-burgundy-700"
                  : "text-espresso-700/80"
              }`}
            >
              Kitchen Display (KDS)
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`text-sm font-medium transition-colors hover:text-burgundy-800 ${
                activeTab === "admin"
                  ? "font-semibold text-burgundy-900 underline underline-offset-8 decoration-burgundy-700"
                  : "text-espresso-700/80"
              }`}
            >
              Admin Dashboard
            </button>
            <a
              href="#architecture"
              className="text-sm font-medium text-espresso-700/80 transition-colors hover:text-burgundy-800"
            >
              Architecture
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/menu"
              className="hidden sm:inline-flex items-center justify-center rounded-lg border border-cream-300 bg-white px-3.5 py-2 text-xs font-semibold text-espresso-900 hover:bg-cream-100 transition-colors shadow-sm"
            >
              Live Menu
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-burgundy-800 px-4 py-2 text-xs sm:text-sm font-medium text-cream-50 shadow-sm transition-all hover:bg-burgundy-900 active:scale-[0.98]"
            >
              <span>Staff Sign In</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden border-b border-cream-200/80 py-16 sm:py-24 lg:py-28">
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-burgundy-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-80 w-80 rounded-full bg-gold-100/50 blur-3xl" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-burgundy-700/20 bg-burgundy-50/80 px-4 py-1.5 text-xs font-semibold text-burgundy-800 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-burgundy-700" />
                <span>Boston &amp; Co. American Eatery • Digital Operating System</span>
              </div>

              <div className="mt-8 flex justify-center">
                <BostonLogo variant="burgundy" size="lg" className="h-16 sm:h-20 w-auto drop-shadow-md" />
              </div>

              <h1 className="mt-6 font-serif text-3xl font-extrabold tracking-tight text-espresso-950 sm:text-5xl lg:text-6xl">
                The Premium Dine-In Ordering Experience.
              </h1>

              <p className="mt-6 text-base leading-relaxed text-espresso-800/80 sm:text-lg">
                Engineered exclusively for Boston &amp; Co. American Eatery. Guests scan
                their table&apos;s unique QR code to explore handcrafted smash burgers,
                stone-baked pizzas, loaded fries, and thick shakes—routing orders directly to
                kitchen preparation stations with real-time ticket tracking.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-burgundy-800 text-cream-50 hover:bg-burgundy-900 shadow-md font-semibold"
                >
                  <Link href="/demo">
                    <UtensilsCrossed className="mr-2 h-5 w-5" />
                    <span>Explore Digital Menu Demo</span>
                  </Link>
                </Button>
                <Link
                  href="/admin"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-cream-300 bg-white/80 px-8 text-base font-medium text-espresso-900 shadow-sm backdrop-blur-sm hover:bg-cream-100 transition-colors"
                >
                  <LayoutDashboard className="mr-2 h-5 w-5 text-burgundy-700" />
                  <span>Admin Command Console</span>
                </Link>
                <Link
                  href="/kitchen"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-cream-300 bg-espresso-950 px-6 text-base font-medium text-cream-50 shadow-sm hover:bg-espresso-900 transition-colors"
                >
                  <ChefHat className="mr-2 h-5 w-5 text-gold-500" />
                  <span>Kitchen Display (KDS)</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-12 grid grid-cols-2 gap-4 pt-8 border-t border-cream-200/80 sm:grid-cols-4">
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl font-bold text-burgundy-800">0%</span>
                  <span className="text-xs text-espresso-700/80">App Download Friction</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl font-bold text-burgundy-800">&lt; 1 sec</span>
                  <span className="text-xs text-espresso-700/80">Realtime Ticket Routing</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl font-bold text-burgundy-800">100%</span>
                  <span className="text-xs text-espresso-700/80">Table QR Binding</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl font-bold text-burgundy-800">Single</span>
                  <span className="text-xs text-espresso-700/80">Restaurant RLS Isolation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE INTERFACE SHOWCASE */}
        <section id="interfaces" className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Badge variant="secondary" className="mb-3 px-3 py-1 font-semibold text-xs">
                Three Distinct Operational Views
              </Badge>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">
                Engineered for Customers, Kitchen, & Management
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-forest-800/80">
                TableTap delivers three tailored, high-performance interfaces designed
                to eliminate order transcription errors and streamline dining service.
              </p>

              {/* Interface Switcher Tabs */}
              <div className="mt-10 inline-flex rounded-xl bg-cream-200/70 p-1.5 shadow-inner">
                <button
                  onClick={() => setActiveTab("customer")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                    activeTab === "customer"
                      ? "bg-white text-forest-950 shadow-sm font-semibold"
                      : "text-forest-800/70 hover:text-forest-950"
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-forest-700" />
                  <span>A. Customer Ordering</span>
                </button>
                <button
                  onClick={() => setActiveTab("kitchen")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                    activeTab === "kitchen"
                      ? "bg-forest-900 text-cream-50 shadow-sm font-semibold"
                      : "text-forest-800/70 hover:text-forest-950"
                  }`}
                >
                  <ChefHat className="h-4 w-4 text-emerald-400" />
                  <span>B. Kitchen Display</span>
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                    activeTab === "admin"
                      ? "bg-white text-forest-950 shadow-sm font-semibold"
                      : "text-forest-800/70 hover:text-forest-950"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-forest-700" />
                  <span>C. Admin Dashboard</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT A: CUSTOMER INTERFACE */}
            {activeTab === "customer" && (
              <div className="mt-12">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-forest-900">
                      <span>Customer Mobile Web Experience</span>
                    </div>
                    <h3 className="mt-4 font-serif text-3xl font-bold text-forest-950">
                      Premium Editorial Menu & Customizer
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-forest-800/80">
                      Inspired by high-end dining aesthetics. Warm cream textures,
                      delicate typography, semantic vegetarian and non-vegetarian markers,
                      and effortless add-on customization.
                    </p>

                    <ul className="mt-6 space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Table-Specific Session:</strong> Scanned QR links directly to Table 04, ensuring correct billing.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Deep Customization:</strong> Select crusts, sizes, extra cheese, and write special kitchen notes.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Live Status & Request Bill:</strong> Track preparation from “Accepted” to “Ready” in real time.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Mock Mobile UI Preview */}
                  <div className="lg:col-span-7">
                    <div className="mx-auto max-w-sm rounded-[2.5rem] border-[8px] border-forest-950/90 bg-white p-4 shadow-2xl ring-1 ring-black/5">
                      {/* Mobile Header */}
                      <div className="flex items-center justify-between border-b border-cream-200 pb-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-burgundy-700">
                            Boston &amp; Co. • Table 04
                          </div>
                          <div className="font-serif text-lg font-bold text-espresso-950">
                            American Eatery
                          </div>
                        </div>
                        <Badge variant="veg" className="text-[10px]">
                          Dining Session
                        </Badge>
                      </div>

                      {/* Category Navigation */}
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
                        <span className="rounded-full bg-burgundy-800 px-3 py-1 font-semibold text-white">
                          Gourmet Burgers
                        </span>
                        <span className="rounded-full bg-cream-100 px-3 py-1 text-espresso-800">
                          Stone-Baked Pizzas
                        </span>
                        <span className="rounded-full bg-cream-100 px-3 py-1 text-espresso-800">
                          Loaded Fries
                        </span>
                      </div>

                      {/* Mock Product Card */}
                      <div className="mt-4 rounded-xl border border-cream-200/90 bg-cream-50/50 p-3 shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="badge-nonveg" title="Non-Vegetarian" />
                              <span className="font-serif text-sm font-bold text-espresso-950">
                                Boston Double Smash
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-espresso-800/70 leading-snug">
                              Twin smashed patties, American cheese, grilled sweet onions &amp; Boston secret sauce.
                            </p>
                            <div className="mt-2 text-xs font-bold text-burgundy-800">
                              ₹389
                            </div>
                          </div>
                          <div className="h-16 w-16 rounded-lg bg-cream-200 flex items-center justify-center text-espresso-700/60 text-xs font-medium">
                            [Photo]
                          </div>
                        </div>

                        {/* Customization Pills */}
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-cream-200/60">
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium border border-cream-300 text-espresso-800">
                            Double Patty
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium border border-cream-300 text-espresso-800">
                            Toasted Brioche
                          </span>
                          <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-300/60 px-2 py-0.5 text-[10px] font-semibold">
                            Extra Cheddar (+₹40)
                          </span>
                        </div>

                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[11px] text-espresso-700/80 font-medium">
                            Qty: 1
                          </span>
                          <button className="rounded-lg bg-burgundy-800 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-burgundy-900">
                            Add to Order • ₹429
                          </button>
                        </div>
                      </div>

                      {/* Floating Cart Bar */}
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-forest-900 p-3 text-cream-50 shadow-lg">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-cream-200/80">
                            2 Items in Cart
                          </div>
                          <div className="text-sm font-bold">₹1,140</div>
                        </div>
                        <button className="rounded-lg bg-spice-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-spice-600 transition-colors">
                          Review &amp; Place Order
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT B: KITCHEN DISPLAY SYSTEM */}
            {activeTab === "kitchen" && (
              <div className="mt-12">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-forest-950 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Kitchen Display System (KDS)</span>
                    </div>
                    <h3 className="mt-4 font-serif text-3xl font-bold text-forest-950">
                      High-Contrast Operational Control
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-forest-800/80">
                      Engineered for high-intensity restaurant kitchens. Bold status
                      indicators, station routing (Pizza, Grill, Bar, Desserts), prep timers,
                      and audible order notification toggles.
                    </p>

                    <ul className="mt-6 space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                        <span className="text-sm text-forest-900">
                          <strong>Station Routing:</strong> Automatically route pizzas to wood-fire oven and cocktails to the bar.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                        <span className="text-sm text-forest-900">
                          <strong>Elapsed Timers:</strong> Dynamic visual indicators for orders waiting longer than standard prep times.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                        <span className="text-sm text-forest-900">
                          <strong>Touch Optimized:</strong> Large, accessible tap targets for busy chefs and kitchen line cooks.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Mock Kitchen Display UI Preview */}
                  <div className="lg:col-span-7">
                    <div className="rounded-2xl border border-kitchen-border bg-kitchen-dark p-5 text-white shadow-2xl">
                      {/* KDS Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-kitchen-border pb-4">
                        <div className="flex items-center gap-3">
                          <ChefHat className="h-6 w-6 text-emerald-400" />
                          <div>
                            <div className="text-xs uppercase tracking-wider text-emerald-400 font-mono">
                              KITCHEN LIVE QUEUE
                            </div>
                            <div className="text-base font-bold text-white">
                              All Active Stations (3 Orders)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg bg-kitchen-card px-3 py-1.5 text-xs text-zinc-300 border border-kitchen-border">
                            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Audio: ON</span>
                          </div>
                          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                            LIVE SYNC
                          </span>
                        </div>
                      </div>

                      {/* Order Cards Grid */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Order Card 1 */}
                        <div className="rounded-xl border border-kitchen-border bg-kitchen-card p-4">
                          <div className="flex items-center justify-between border-b border-kitchen-border/80 pb-2">
                            <div>
                              <span className="rounded bg-emerald-950 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                                TABLE 04
                              </span>
                              <span className="ml-2 font-mono text-xs text-zinc-400">
                                #TT-1042
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-bold">
                              <Clock className="h-3.5 w-3.5" />
                              <span>4m ago</span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  1× Wild Truffle &amp; Porcini
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  Sourdough, Extra Mozzarella
                                </div>
                              </div>
                              <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                                PIZZA
                              </span>
                            </div>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  2× Sparkling Basil Lemonade
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  Less sweet
                                </div>
                              </div>
                              <span className="rounded bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-mono text-blue-300">
                                BAR
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-kitchen-border flex gap-2">
                            <button className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 text-xs font-bold text-white transition-colors">
                              Mark Preparing
                            </button>
                          </div>
                        </div>

                        {/* Order Card 2 */}
                        <div className="rounded-xl border border-amber-500/40 bg-kitchen-card p-4">
                          <div className="flex items-center justify-between border-b border-kitchen-border/80 pb-2">
                            <div>
                              <span className="rounded bg-amber-950 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
                                TABLE 12
                              </span>
                              <span className="ml-2 font-mono text-xs text-zinc-400">
                                #TT-1040
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-bold">
                              <Clock className="h-3.5 w-3.5" />
                              <span>14m ago</span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  2× Angus Smoked Burger
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  Medium-rare, No pickles
                                </div>
                              </div>
                              <span className="rounded bg-rose-900/60 px-1.5 py-0.5 text-[10px] font-mono text-rose-300">
                                GRILL
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-kitchen-border flex gap-2">
                            <button className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-xs font-bold text-kitchen-dark transition-colors">
                              Ready to Serve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT C: RESTAURANT ADMIN DASHBOARD */}
            {activeTab === "admin" && (
              <div className="mt-12">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-forest-900">
                      <LayoutDashboard className="h-3.5 w-3.5 text-forest-800" />
                      <span>SaaS Operations Dashboard</span>
                    </div>
                    <h3 className="mt-4 font-serif text-3xl font-bold text-forest-950">
                      Complete Control Over Your Venue
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-forest-800/80">
                      Manage restaurant profiles, menu categories, dynamic pricing,
                      table QR token generation, and real-time business performance from
                      a unified command center.
                    </p>

                    <ul className="mt-6 space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Dynamic QR Manager:</strong> Generate, download, and print table QR codes with revocable tokens.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Real-Time Analytics:</strong> Monitor gross sales, top-selling dishes, and average order value.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-forest-700" />
                        <span className="text-sm text-forest-900">
                          <strong>Menu CMS:</strong> Instantly toggle sold-out items, modify pricing, and configure option groups.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Mock Admin UI Preview */}
                  <div className="lg:col-span-7">
                    <div className="rounded-2xl border border-cream-200/90 bg-white p-5 shadow-xl">
                      {/* Dashboard Header */}
                      <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                        <div>
                          <div className="font-serif text-lg font-bold text-espresso-950">
                            Boston &amp; Co. American Eatery • Admin Command
                          </div>
                          <div className="text-xs text-espresso-700/70">
                            Logged in as Restaurant Administrator
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs bg-burgundy-800 text-cream-50">
                          Single-Restaurant Live
                        </Badge>
                      </div>

                      {/* Stats Row */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
                          <div className="flex items-center justify-between text-xs text-forest-700 font-medium">
                            <span>Today&apos;s Revenue</span>
                            <DollarSign className="h-3.5 w-3.5 text-forest-700" />
                          </div>
                          <div className="mt-1 font-serif text-xl font-bold text-forest-950">
                            ₹48,920
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-3 w-3" /> +18.4% vs last week
                          </div>
                        </div>

                        <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
                          <div className="flex items-center justify-between text-xs text-forest-700 font-medium">
                            <span>Orders</span>
                            <UtensilsCrossed className="h-3.5 w-3.5 text-forest-700" />
                          </div>
                          <div className="mt-1 font-serif text-xl font-bold text-forest-950">
                            64
                          </div>
                          <div className="text-[10px] text-forest-700/70 mt-0.5">
                            Avg ₹764 / table
                          </div>
                        </div>

                        <div className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
                          <div className="flex items-center justify-between text-xs text-forest-700 font-medium">
                            <span>Active Tables</span>
                            <QrCode className="h-3.5 w-3.5 text-forest-700" />
                          </div>
                          <div className="mt-1 font-serif text-xl font-bold text-forest-950">
                            14 / 18
                          </div>
                          <div className="text-[10px] text-forest-700/70 mt-0.5">
                            78% Occupancy
                          </div>
                        </div>
                      </div>

                      {/* Mock Table QR Code Management Preview */}
                      <div className="mt-4 rounded-xl border border-cream-200 p-3 bg-cream-50/20">
                        <div className="flex justify-between items-center text-xs font-bold text-forest-950 mb-2">
                          <span>Table QR Management</span>
                          <span className="text-[11px] font-normal text-forest-700">18 Tables Configured</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg border border-cream-300 bg-white p-2">
                            <div className="font-bold text-forest-900">Table 01</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">Dining Active</div>
                            <button className="mt-1 text-[10px] text-forest-700 underline">Print QR</button>
                          </div>
                          <div className="rounded-lg border border-cream-300 bg-white p-2">
                            <div className="font-bold text-forest-900">Table 02</div>
                            <div className="text-[10px] text-zinc-500 font-semibold">Vacant</div>
                            <button className="mt-1 text-[10px] text-forest-700 underline">Print QR</button>
                          </div>
                          <div className="rounded-lg border border-cream-300 bg-white p-2">
                            <div className="font-bold text-forest-900">Table 03</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">Dining Active</div>
                            <button className="mt-1 text-[10px] text-forest-700 underline">Print QR</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. TECHNICAL ARCHITECTURE SECTION */}
        <section id="architecture" className="border-t border-cream-200/80 bg-cream-100/50 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-3 px-3 py-1 font-semibold text-xs">
                Production-Ready Engineering
              </Badge>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">
                Built for Scalability, Security, & High Concurrency
              </h2>
              <p className="mt-4 text-base text-forest-800/80">
                TableTap is architected specifically for seamless single-restaurant operations.
                Transactional safety, cryptographic QR table binding, and server-side pricing
                are enforced directly inside PostgreSQL.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-cream-200/80 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-forest-950">
                    Role &amp; QR Security (RLS)
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-forest-800/80">
                    Strict PostgreSQL Row Level Security separates Admin, Kitchen, and
                    anonymous Guest QR access—no unauthenticated reads on private tables or orders.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-cream-200/80 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-forest-950">
                    Supabase Realtime Sync
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-forest-800/80">
                    Instant WebSocket order dispatch from customer phones to the kitchen line.
                    Automatic reconnect and fallback polling ensure zero dropped tickets.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-cream-200/80 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-forest-950">
                    Immutable Order Snapshots
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-forest-800/80">
                    Menu changes never distort past receipts. Unit prices, customizations,
                    and stations are snapshotted at the exact instant of order submission.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-cream-200/80 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-forest-950">
                    Server-Side Price Validation
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-forest-800/80">
                    Clients never dictate prices. The server re-validates catalog availability,
                    option add-ons, taxes, and totals before committing to PostgreSQL.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 5. DEPLOYMENT & QUICK LAUNCH */}
        <section id="demo" className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-cream-200 bg-white p-8 shadow-xl sm:p-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div>
                  <Badge variant="veg" className="text-xs font-semibold">
                    Single-Restaurant Platform Ready
                  </Badge>
                  <h2 className="mt-3 font-serif text-3xl font-bold text-forest-950">
                    Launch Your Digital Menu in Minutes
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-forest-800/80">
                    TableTap ships with an editorial customer menu, customizable variants and add-ons,
                    cryptographic table QR codes with ZIP export, real-time Kitchen Display System,
                    Razorpay checkout integration, and live business analytics.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-forest-900">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-forest-700" />
                      <span>Clean Single-Restaurant PostgreSQL Schema</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-forest-700" />
                      <span>Strict Row Level Security (RLS)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-forest-700" />
                      <span>Supabase Realtime &amp; Storage</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="default">
                    <Link href="/admin">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/kitchen">
                      <ChefHat className="mr-2 h-4 w-4" />
                      <span>Kitchen Display</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="spice">
                    <Link href="/setup-required">
                      <span>SQL Setup Guide</span>
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. PROFESSIONAL FOOTER */}
      <footer className="border-t border-cream-200/80 bg-cream-100/40 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-800 text-cream-50 shadow-sm">
                <QrCode className="h-4 w-4" />
              </div>
              <span className="font-serif text-lg font-bold text-forest-950">
                TableTap SaaS
              </span>
            </div>

            <p className="text-xs text-forest-700/70">
              © 2026 TableTap. Production-grade QR restaurant ordering &amp; kitchen management architecture.
            </p>

            <div className="flex items-center gap-6 text-xs font-medium text-forest-800">
              <Link href="/demo" className="hover:text-forest-950 transition-colors">
                Menu Demo
              </Link>
              <Link href="/login" className="hover:text-forest-950 transition-colors">
                Portal Sign In
              </Link>
              <Link href="/setup-required" className="hover:text-forest-950 transition-colors">
                Setup Guide
              </Link>
              <span className="text-forest-700/50">|</span>
              <span className="text-forest-700/80">v1.0 Production Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
