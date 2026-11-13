import { getIsolatedDemoMenu } from "@/lib/demo/catalog";
import { CustomerMenuView } from "@/components/customer/customer-menu-view";

export const metadata = {
  title: "Boston & Co. American Eatery — Interactive Digital Menu Preview | TableTap",
  description:
    "Explore Boston & Co.'s mobile-first digital menu, customization engine, and instant table ordering experience.",
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
