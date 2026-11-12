import { Category, OptionGroup, Product, RestaurantPublicProfile } from "@/types/menu";

/**
 * Representative 14-Category Restaurant Catalog
 * Used for:
 * 1) 1-Click Sample Menu Seeding inside the authenticated Admin Dashboard (writes real DB records)
 * 2) Clearly labeled Interactive UI Preview (`/demo`) when inspecting design before Supabase DB setup
 */

export const SAMPLE_STATIONS = [
  { name: "Pizza", description: "Wood-fired & stone-baked pizzas and garlic breads", color_hex: "#D93829" },
  { name: "Grill", description: "Burgers, wraps, sandwiches, wings & appetizers", color_hex: "#F58220" },
  { name: "Main Kitchen", description: "Artisan pastas, fries & plated mains", color_hex: "#1B5E3A" },
  { name: "Beverages", description: "Thick shakes, cold brews & hot artisanal drinks", color_hex: "#0369A1" },
  { name: "Desserts", description: "Warm brownies, cheesecakes & sweet finishes", color_hex: "#9333EA" },
];

export const SAMPLE_CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}> = [
  { name: "Veg Pizza", slug: "veg-pizza", description: "Hand-stretched sourdough crusts with artisanal vegetarian toppings", sort_order: 1 },
  { name: "Non-Veg Pizza", slug: "non-veg-pizza", description: "Wood-fired classics topped with slow-roasted meats and smoky pepperoni", sort_order: 2 },
  { name: "Personal Pizza", slug: "personal-pizza", description: "Perfectly portioned 7-inch individual stone-baked pies", sort_order: 3 },
  { name: "Wraps", slug: "wraps", description: "Warm tortilla wraps packed with grilled fillings and house sauces", sort_order: 4 },
  { name: "Sandwiches", slug: "sandwiches", description: "Toasted ciabatta and sourdough melts made fresh to order", sort_order: 5 },
  { name: "Garlic Bread", slug: "garlic-bread", description: "Golden herb-buttered loaves baked crisp in our stone oven", sort_order: 6 },
  { name: "Appetizers", slug: "appetizers", description: "Shareable starters crafted to awaken the palate", sort_order: 7 },
  { name: "Burgers", slug: "burgers", description: "Brioche-bun smash burgers and crispy spiced patties", sort_order: 8 },
  { name: "Pasta", slug: "pasta", description: "Al dente Italian pastas simmered in slow-cooked house sauces", sort_order: 9 },
  { name: "Fries", slug: "fries", description: "Double-cooked crisp fries with truffle, peri-peri, or loaded cheese", sort_order: 10 },
  { name: "Wings and Strips", slug: "wings-and-strips", description: "Glazed chicken wings and golden tender strips with house dips", sort_order: 11 },
  { name: "Shakes", slug: "shakes", description: "Thick hand-spun gelato shakes topped with whipped cream", sort_order: 12 },
  { name: "Hot Drinks", slug: "hot-drinks", description: "Single-origin espresso, velvety hot chocolate & spiced teas", sort_order: 13 },
  { name: "Desserts", slug: "desserts", description: "Indulgent sweet plates baked in-house daily", sort_order: 14 },
];

export interface SampleProductSeed {
  categorySlug: string;
  stationName: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  dietary_type: "veg" | "non-veg" | "vegan" | "egg";
  is_popular: boolean;
  is_featured: boolean;
  is_chef_special: boolean;
  prep_time_minutes: number;
  image_url: string;
  variants?: Array<{ name: string; price: number; is_default?: boolean }>;
  attachPizzaOptions?: boolean;
}

export const SAMPLE_PRODUCTS: SampleProductSeed[] = [
  {
    categorySlug: "veg-pizza",
    stationName: "Pizza",
    name: "Margherita Classica",
    slug: "margherita-classica",
    description: "San Marzano tomato base, fresh fior di latte mozzarella, garden basil & cold-pressed olive oil.",
    base_price: 399,
    dietary_type: "veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: false,
    prep_time_minutes: 14,
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 399, is_default: true },
      { name: "Large (12\")", price: 499 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "veg-pizza",
    stationName: "Pizza",
    name: "Wild Truffle & Farmhouse",
    slug: "wild-truffle-farmhouse",
    description: "Charred bell peppers, sweet red onions, porcini mushrooms, black olives & aromatic truffle drizzle.",
    base_price: 449,
    dietary_type: "veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 16,
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 449, is_default: true },
      { name: "Large (12\")", price: 569 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "non-veg-pizza",
    stationName: "Pizza",
    name: "Smoked Pepperoni & Hot Honey",
    slug: "smoked-pepperoni-hot-honey",
    description: "Crispy cupped pepperoni slices, aged mozzarella, oregano & house-infused chili honey finish.",
    base_price: 499,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 15,
    image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 499, is_default: true },
      { name: "Large (12\")", price: 629 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "non-veg-pizza",
    stationName: "Pizza",
    name: "Peri-Peri Charred Chicken",
    slug: "peri-peri-charred-chicken",
    description: "Flame-grilled peri-peri chicken strips, caramelized onions, jalapeños & smoked paprika crema.",
    base_price: 479,
    dietary_type: "non-veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 16,
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 479, is_default: true },
      { name: "Large (12\")", price: 599 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "personal-pizza",
    stationName: "Pizza",
    name: "Personal Paneer Tikka Melt",
    slug: "personal-paneer-tikka-melt",
    description: "7-inch stone-baked sourdough topped with tandoori spiced paneer, pickled onion & mint drizzle.",
    base_price: 269,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 12,
    image_url: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80",
    attachPizzaOptions: true,
  },
  {
    categorySlug: "wraps",
    stationName: "Grill",
    name: "Crispy Falafel & Harissa Wrap",
    slug: "crispy-falafel-harissa-wrap",
    description: "Herb falafel, roasted red pepper hummus, crunchy slaw & smoky harissa folded in a toasted tortilla.",
    base_price: 249,
    dietary_type: "veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 10,
    image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "sandwiches",
    stationName: "Grill",
    name: "Pesto Caprese Focaccia",
    slug: "pesto-caprese-focaccia",
    description: "Rosemary focaccia pressed golden with basil pesto, buffalo mozzarella & balsamic tomatoes.",
    base_price: 279,
    dietary_type: "veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 10,
    image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "garlic-bread",
    stationName: "Pizza",
    name: "Stuffed Cheesy Garlic Bread",
    slug: "stuffed-cheesy-garlic-bread",
    description: "Six warm pull-apart garlic loaves stuffed with molten mozzarella, sweet corn & jalapeño butter.",
    base_price: 199,
    dietary_type: "veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: false,
    prep_time_minutes: 10,
    image_url: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "appetizers",
    stationName: "Grill",
    name: "Loaded Nachos Grande",
    slug: "loaded-nachos-grande",
    description: "Crisp corn tortillas layered with cheddar queso, black beans, pico de gallo & smashed avocado.",
    base_price: 299,
    dietary_type: "veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 10,
    image_url: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "burgers",
    stationName: "Grill",
    name: "Truffle Double Smash Burger",
    slug: "truffle-double-smash-burger",
    description: "Double seared chicken smash patties, aged cheddar, caramelized onions & truffle aioli in toasted brioche.",
    base_price: 369,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 14,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "pasta",
    stationName: "Main Kitchen",
    name: "Creamy Pink Sauce Penne",
    slug: "creamy-pink-sauce-penne",
    description: "Artisan bronze-die penne tossed in a velvety blend of San Marzano tomato & parmesan cream.",
    base_price: 349,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 15,
    image_url: "https://images.unsplash.com/photo-1621996346565-e3d33b843b57?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "fries",
    stationName: "Main Kitchen",
    name: "Truffle Parmesan Fries",
    slug: "truffle-parmesan-fries",
    description: "Hand-cut crispy golden fries dusted with roasted garlic sea salt, white truffle oil & shaved grana.",
    base_price: 189,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 8,
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "wings-and-strips",
    stationName: "Grill",
    name: "Smoky BBQ Glazed Wings (6 pcs)",
    slug: "smoky-bbq-glazed-wings",
    description: "Double-crisped chicken wings tossed in espresso hickory BBQ glaze with cool ranch dip.",
    base_price: 319,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 14,
    image_url: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "shakes",
    stationName: "Beverages",
    name: "Belgian Dark Chocolate Shake",
    slug: "belgian-dark-chocolate-shake",
    description: "70% Belgian dark chocolate gelato spun thick with chilled cream and cocoa nibs.",
    base_price: 229,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 6,
    image_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "hot-drinks",
    stationName: "Beverages",
    name: "Single-Origin Flat White",
    slug: "single-origin-flat-white",
    description: "Double ristretto shot pulled from Chikmagalur Arabica beans topped with silky microfoam.",
    base_price: 179,
    dietary_type: "veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 5,
    image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "desserts",
    stationName: "Desserts",
    name: "Warm Hazelnut Tiramisu",
    slug: "warm-hazelnut-tiramisu",
    description: "Espresso-soaked savoiardi layered with whipped mascarpone & roasted Piedmont hazelnuts.",
    base_price: 289,
    dietary_type: "egg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 6,
    image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
  },
];

/**
 * Isolated Static Preview Catalog for `/demo` (clearly labeled UI preview before live Supabase connection)
 */
export function getIsolatedDemoMenu(): {
  restaurant: RestaurantPublicProfile;
  categories: Category[];
  products: Product[];
} {
  const now = new Date().toISOString();

  const restaurant: RestaurantPublicProfile = {
    id: "single-restaurant",
    name: "Pizza House — Artisan Kitchen",
    description:
      "Hand-stretched 48-hour sourdough pizzas, gourmet smash burgers, and artisanal shakes crafted fresh to your table.",
    logo_url: null,
    cover_image_url:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    currency: "INR",
    timezone: "Asia/Kolkata",
    tax_rate: 5,
    service_charge_rate: 0,
    phone: "+91 98200 12345",
    email: "hello@pizzahouse.demo",
    address: "14 Culinary Lane, Bandra West, Mumbai",
    opening_hours: {
      "Mon – Thu": "11:30 AM – 11:00 PM",
      "Fri – Sun": "11:30 AM – 12:30 AM",
    },
    is_accepting_orders: true,
  };

  const categories: Category[] = SAMPLE_CATEGORIES.map((c, idx) => ({
    id: `demo-cat-${idx + 1}`,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: null,
    sort_order: c.sort_order,
    active: true,
    created_at: now,
    updated_at: now,
  }));

  const pizzaOptionGroups: OptionGroup[] = [
    {
      id: "demo-og-crust",
      name: "Crust Choice",
      description: "Select your preferred dough preparation",
      required: true,
      min_select: 1,
      max_select: 1,
      active: true,
      options: [
        { id: "demo-ov-classic", option_group_id: "demo-og-crust", name: "48h Classic Sourdough", price_delta: 0, is_default: true, active: true, sort_order: 1 },
        { id: "demo-ov-thin", option_group_id: "demo-og-crust", name: "Roman Thin & Crisp", price_delta: 0, is_default: false, active: true, sort_order: 2 },
        { id: "demo-ov-burst", option_group_id: "demo-og-crust", name: "Cheese Burst Crust", price_delta: 89, is_default: false, active: true, sort_order: 3 },
      ],
    },
    {
      id: "demo-og-addons",
      name: "Extra Add-Ons & Toppings",
      description: "Customize with extra cheese or artisan toppings",
      required: false,
      min_select: 0,
      max_select: 4,
      active: true,
      options: [
        { id: "demo-ov-cheese", option_group_id: "demo-og-addons", name: "Extra Mozzarella Cheese", price_delta: 49, is_default: false, active: true, sort_order: 1 },
        { id: "demo-ov-toppings", option_group_id: "demo-og-addons", name: "Extra Toppings (Olives / Jalapeños)", price_delta: 39, is_default: false, active: true, sort_order: 2 },
        { id: "demo-ov-garlic", option_group_id: "demo-og-addons", name: "Roasted Garlic Dip", price_delta: 29, is_default: false, active: true, sort_order: 3 },
        { id: "demo-ov-no-onion", option_group_id: "demo-og-addons", name: "No Onion / No Garlic Prep", price_delta: 0, is_default: false, active: true, sort_order: 4 },
      ],
    },
  ];

  const products: Product[] = SAMPLE_PRODUCTS.map((p, idx) => {
    const cat = categories.find((c) => c.slug === p.categorySlug) ?? categories[0];
    const prodId = `demo-prod-${idx + 1}`;
    return {
      id: prodId,
      category_id: cat.id,
      station_id: null,
      station_name: p.stationName,
      name: p.name,
      slug: p.slug,
      description: p.description,
      image_url: p.image_url,
      base_price: p.base_price,
      dietary_type: p.dietary_type,
      is_popular: p.is_popular,
      is_featured: p.is_featured,
      is_chef_special: p.is_chef_special,
      prep_time_minutes: p.prep_time_minutes,
      sort_order: idx + 1,
      active: true,
      available: true,
      variants: p.variants?.map((v, vIdx) => ({
        id: `${prodId}-var-${vIdx + 1}`,
        product_id: prodId,
        name: v.name,
        price: v.price,
        is_default: Boolean(v.is_default),
        active: true,
        available: true,
        sort_order: vIdx + 1,
      })),
      option_groups: p.attachPizzaOptions ? pizzaOptionGroups : [],
      created_at: now,
      updated_at: now,
    };
  });

  return { restaurant, categories, products };
}
