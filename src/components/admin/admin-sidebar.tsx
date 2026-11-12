"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  ClipboardList,
  BarChart3,
  Settings,
  ChefHat,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  restaurantName: string;
  userEmail: string;
  userRole: string;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu & Items", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({
  restaurantName,
  userEmail,
  userRole,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-cream-200 p-4">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-cream-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-cream-50 shadow-sm">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-serif text-base font-bold text-forest-950">
              {restaurantName}
            </div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-forest-700">
              TableTap • {userRole}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-forest-800 text-cream-50 shadow-sm font-semibold"
                    : "text-forest-800 hover:bg-cream-100 hover:text-forest-950"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cross-Experience Quick Shortcuts */}
        <div className="mt-8 border-t border-cream-200 pt-5 space-y-1.5">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-forest-700/70">
            Live Operations
          </div>
          <Link
            href="/kitchen"
            className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-forest-900 hover:bg-cream-100"
          >
            <span className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-emerald-700" />
              <span>Kitchen Display</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-forest-700/60" />
          </Link>
          <Link
            href="/menu"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-forest-900 hover:bg-cream-100"
          >
            <span className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-spice-600" />
              <span>Public Customer Menu</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-forest-700/60" />
          </Link>
        </div>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="border-t border-cream-200 pt-4 space-y-3">
        <div className="px-2">
          <div className="truncate text-xs font-semibold text-forest-950">
            {userEmail}
          </div>
          <div className="text-[11px] text-forest-700/80">
            Single-Restaurant RLS Active
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-xs font-semibold text-tomato-700 hover:bg-tomato-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-cream-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-800 text-cream-50">
            <QrCode className="h-4 w-4" />
          </div>
          <span className="font-serif font-bold text-forest-950">
            {restaurantName}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-forest-800 hover:bg-cream-100"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-forest-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 h-full">{navContent}</div>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{navContent}</aside>
    </>
  );
}
