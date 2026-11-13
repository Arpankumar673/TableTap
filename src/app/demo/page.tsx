import { redirect } from "next/navigation";

export default function DemoPage() {
  // Redirect directly to the live customer menu
  redirect("/menu");
}
