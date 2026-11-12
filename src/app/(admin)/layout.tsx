import React from "react";
import { requireStaffRole } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaffRole(["admin"]);

  return (
    <div className="flex min-h-screen flex-col bg-cream-50/70 lg:flex-row">
      <AdminSidebar
        restaurantName={ctx.settings.name}
        userEmail={ctx.user.email}
        userRole={ctx.role}
      />
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
