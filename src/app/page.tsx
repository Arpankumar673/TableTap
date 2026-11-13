import { redirect } from "next/navigation";
import { getOptionalStaffContext } from "@/lib/auth/session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Portal | Boston & Co. American Eatery",
  description: "Sign in to manage Boston & Co. restaurant operations, tables, and live orders.",
};

/**
 * Root Route (/) Direct Admin Architecture:
 * - Unauthenticated user → Boston & Co. Admin Login Console.
 * - Authenticated administrator → Directly redirected to Admin Dashboard (/admin).
 * - Authenticated kitchen user → Directly redirected to Kitchen Display System (/kitchen).
 * Strictly zero marketing or promotional landing content.
 */
export default async function RootPage() {
  const { context } = await getOptionalStaffContext();

  // Authenticated administrator -> Redirect directly to Admin Dashboard
  if (context?.role === "admin") {
    redirect("/admin");
  }

  // Authenticated kitchen operator -> Redirect directly to Kitchen Display System
  if (context?.role === "kitchen") {
    redirect("/kitchen");
  }

  // Unauthenticated user -> Render direct Admin Login interface
  return <AdminLoginForm />;
}
