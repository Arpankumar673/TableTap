import React from "react";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream-200/80 pb-5">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-cream-200" />
          <div className="h-4 w-96 rounded-md bg-cream-100" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 w-32 rounded-lg bg-cream-200" />
          <div className="h-9 w-36 rounded-lg bg-burgundy-900/20" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-cream-100" />
              <div className="h-7 w-7 rounded-lg bg-cream-200" />
            </div>
            <div className="h-6 w-20 rounded bg-cream-200" />
            <div className="h-2.5 w-24 rounded bg-cream-100" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-cream-100 pb-4">
          <div className="h-5 w-48 rounded bg-cream-200" />
          <div className="h-8 w-24 rounded-lg bg-cream-100" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-cream-100 bg-cream-50/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cream-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-cream-200" />
                  <div className="h-3 w-24 rounded bg-cream-100" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-cream-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
