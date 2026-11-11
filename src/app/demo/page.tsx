import { getIsolatedDemoMenu } from "@/lib/demo/catalog";
import { CustomerMenuView } from "@/components/customer/customer-menu-view";

export const metadata = {
  title: "Pizza House — Interactive Customer Menu Preview | TableTap",
  description:
    "Explore TableTap's mobile-first editorial customer menu, customization engine, and cart experience.",
};

export default function DemoMenuPage() {
  const { restaurant, categories, products } = getIsolatedDemoMenu();

  return (
    <CustomerMenuView
      restaurant={restaurant}
      categories={categories}
      products={products}
      isDemoPreview={true}
    />
  );
}
