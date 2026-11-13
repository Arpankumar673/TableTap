import { redirect } from "next/navigation";
import { getOptionalStaffContext } from "@/lib/auth/session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Sign In | Boston & Co. American Eatery",
  description: "Sign in to access the Boston & Co. Admin Console or Kitchen Display.",
};

export default async function LoginPage() {
  const { context } = await getOptionalStaffContext();

  if (context?.role === "admin") {
    redirect("/admin");
  }

  if (context?.role === "kitchen") {
    redirect("/kitchen");
  }

  return <AdminLoginForm />;
}
