import React from "react";

export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-cream-50 text-espresso-950 animate-pulse">
      {/* Brand Header Skeleton */}
      <header className="sticky top-0 z-40 border-b border-cream-200/90 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="h-9 w-32 rounded-lg bg-cream-200" />
          <div className="h-8 w-24 rounded-full bg-cream-200" />
        </div>
      </header>

      {/* Hero Banner Skeleton */}
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <div className="h-44 w-full rounded-3xl bg-cream-200/80" />
      </div>

      {/* Category Pills Skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-5 flex gap-2 overflow-x-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-28 shrink-0 rounded-full bg-cream-200" />
        ))}
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm"
            >
              <div className="flex-1 space-y-2">
                <div className="h-5 w-36 rounded bg-cream-200" />
                <div className="h-3 w-48 rounded bg-cream-100" />
                <div className="h-5 w-20 rounded bg-cream-200 pt-2" />
              </div>
              <div className="h-24 w-24 shrink-0 rounded-xl bg-cream-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
