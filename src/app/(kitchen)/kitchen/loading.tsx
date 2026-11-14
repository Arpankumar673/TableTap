import React from "react";

export default function KitchenLoading() {
  return (
    <div className="min-h-screen bg-kitchen-dark text-zinc-100 animate-pulse">
      {/* Top Header Skeleton */}
      <header className="sticky top-0 z-30 border-b border-kitchen-border bg-kitchen-dark/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-zinc-800" />
              <div className="h-3 w-64 rounded bg-zinc-900" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-zinc-800" />
            <div className="h-9 w-24 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>

      {/* Subheader / Tabs Skeleton */}
      <div className="border-b border-kitchen-border bg-kitchen-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-lg bg-zinc-800" />
            ))}
          </div>
          <div className="h-8 w-48 rounded-lg bg-zinc-800" />
        </div>
      </div>

      {/* Ticket Grid Skeleton */}
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-kitchen-border bg-kitchen-card p-5 space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="h-6 w-28 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-zinc-800" />
              </div>
              <div className="space-y-2.5">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between items-center py-1">
                    <div className="h-4 w-44 rounded bg-zinc-800" />
                    <div className="h-4 w-8 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <div className="h-10 w-full rounded-xl bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
