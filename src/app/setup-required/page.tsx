import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Setup-required route has been superseded by production configuration.
 * All traffic redirects immediately to the root route.
 */
export default function SetupRequiredPage() {
  redirect("/");
}
