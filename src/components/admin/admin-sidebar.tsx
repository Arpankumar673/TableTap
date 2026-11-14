"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  SquareDashedBottomCode,
  QrCode,
  ClipboardList,
  ChefHat,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BostonLogo } from "@/components/shared/boston-logo";

interface AdminSidebarProps {
  restaurantName: string;
  userEmail: string;
  userRole: string;
}

// Exactly 8 operational sections for Boston & Co. Restaurant Admin
const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu Management", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Table Management", icon: SquareDashedBottomCode },
  { href: "/admin/qr", label: "QR Management", icon: QrCode },
  { href: "/admin/orders", label: "Order Management", icon: ClipboardList },
  { href: "/kitchen", label: "Kitchen Display (KDS)", icon: ChefHat },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Restaurant Settings", icon: Settings },
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
    window.location.href = "/";
  }

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-cream-200 p-4">
      <div>
        {/* Brand */}
        <div className="flex flex-col gap-2 px-2 py-3 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <BostonLogo variant="burgundy" size="sm" className="h-8 w-auto" />
          </div>
          <div className="min-w-0 mt-1">
            <div className="truncate font-serif text-sm font-bold text-espresso-950">
              {restaurantName || "Boston & Co. Eatery"}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-burgundy-700">
              Admin Command Console
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || (item.href !== "/kitchen" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-burgundy-800 text-cream-50 shadow-sm font-semibold"
                    : "text-espresso-800 hover:bg-cream-100 hover:text-espresso-950"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cross-Experience Quick Shortcuts */}
        <div className="mt-6 border-t border-cream-200 pt-4 space-y-1.5">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-espresso-600/70">
            Guest View
          </div>
          <Link
            href="/menu"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-espresso-900 hover:bg-cream-100"
          >
            <span className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-burgundy-600" />
              <span>Public Customer Menu</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-espresso-700/60" />
          </Link>
        </div>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="border-t border-cream-200 pt-4 space-y-3">
        <div className="px-2">
          <div className="truncate text-xs font-semibold text-espresso-950">
            {userEmail}
          </div>
          <div className="text-[11px] text-burgundy-700 font-medium capitalize">
            {userRole} • Security Active
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-xs font-semibold text-burgundy-700 hover:bg-burgundy-50 transition-colors"
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
          <BostonLogo variant="burgundy" size="sm" className="h-7 w-auto" />
          <span className="font-serif font-bold text-xs text-espresso-950">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-espresso-800 hover:bg-cream-100"
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
