import { Category, OptionGroup, Product, RestaurantPublicProfile } from "@/types/menu";

/**
 * Representative 14-Category Restaurant Catalog
 * Used for:
 * 1) 1-Click Sample Menu Seeding inside the authenticated Admin Dashboard (writes real DB records)
 * 2) Clearly labeled Interactive UI Preview (`/demo`) when inspecting design before Supabase DB setup
 */

export const SAMPLE_STATIONS = [
  { name: "Burger & Grill", description: "Smash burgers, grilled melts, wings & crispy tenders", color_hex: "#B91C1C" },
  { name: "Pizza Oven", description: "Stone-baked sourdough pizzas and loaded garlic breads", color_hex: "#D97706" },
  { name: "Fry & Sides", description: "Hand-cut loaded fries, onion rings & shareable appetizers", color_hex: "#7F1D1D" },
  { name: "Bar & Shakes", description: "Hand-spun gelato shakes, craft sodas & artisan coffees", color_hex: "#251E19" },
  { name: "Dessert Station", description: "Warm skillet cookies, brownies & American cheesecakes", color_hex: "#9333EA" },
];

export const SAMPLE_CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}> = [
  { name: "Gourmet Burgers", slug: "burgers", description: "Brioche-bun double smash patties, crispy chicken & artisan stacks", sort_order: 1 },
  { name: "Stone-Baked Pizzas", slug: "pizzas", description: "Slow-fermented sourdough crusts with signature American & Italian toppings", sort_order: 2 },
  { name: "Hand-Cut Loaded Fries", slug: "fries", description: "Double-fried crisp russets tossed with truffle, queso, and fiery spices", sort_order: 3 },
  { name: "Wings & Tenders", slug: "wings-tenders", description: "Glazed crisp wings and golden tenders served with signature house dips", sort_order: 4 },
  { name: "Sandwiches & Melts", slug: "sandwiches", description: "Toasted sourdough and ciabatta melts packed with slow-cooked meats and cheese", sort_order: 5 },
  { name: "Appetizers & Starters", slug: "appetizers", description: "Crispy mozzarella sticks, loaded nachos & onion rings crafted for sharing", sort_order: 6 },
  { name: "Thick Hand-Spun Shakes", slug: "shakes", description: "Artisan gelato blended thick with whole cream, caramel & chocolate", sort_order: 7 },
  { name: "Artisanal Beverages", slug: "beverages", description: "Cold brews, craft sodas, iced teas and barista-pulled espresso", sort_order: 8 },
  { name: "Classic Desserts", slug: "desserts", description: "Indulgent American dessert plates baked fresh in-house daily", sort_order: 9 },
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
    categorySlug: "burgers",
    stationName: "Burger & Grill",
    name: "Boston Double Smash Burger",
    slug: "boston-double-smash-burger",
    description: "Twin seared smashed beef/chicken patties, double melted American cheese, grilled sweet onions, house pickles & Boston secret sauce on a toasted butter brioche bun.",
    base_price: 389,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 12,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Double Patty (Standard)", price: 389, is_default: true },
      { name: "Triple Patty Monster", price: 489 },
    ],
  },
  {
    categorySlug: "burgers",
    stationName: "Burger & Grill",
    name: "Nashville Hot Crispy Chicken Burger",
    slug: "nashville-hot-crispy-chicken",
    description: "24-hour buttermilk soaked chicken thigh, double-breaded cayenne crisp, creamy cider slaw, dill pickles & smoked chipotle mayo.",
    base_price: 369,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: false,
    prep_time_minutes: 14,
    image_url: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "burgers",
    stationName: "Burger & Grill",
    name: "Truffle Mushroom & Swiss (Veg)",
    slug: "truffle-mushroom-swiss-burger",
    description: "Crispy herb-crusted portobello & potato patty, sautéed wild porcini, molten Swiss emmental, arugula & black truffle aioli.",
    base_price: 329,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: true,
    prep_time_minutes: 12,
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "pizzas",
    stationName: "Pizza Oven",
    name: "Smoked Pepperoni & Hot Honey",
    slug: "smoked-pepperoni-hot-honey",
    description: "Hand-stretched 48-hour fermented sourdough, San Marzano tomato base, aged mozzarella, cupped smoky pepperoni & fiery chili hot honey drizzle.",
    base_price: 499,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 15,
    image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 499, is_default: true },
      { name: "Large (12\")", price: 649 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "pizzas",
    stationName: "Pizza Oven",
    name: "Margherita Classica",
    slug: "margherita-classica",
    description: "Italian plum tomatoes, buffalo fior di latte mozzarella, garden basil leaves & cold-pressed extra virgin olive oil.",
    base_price: 399,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 12,
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
    variants: [
      { name: "Medium (10\")", price: 399, is_default: true },
      { name: "Large (12\")", price: 519 },
    ],
    attachPizzaOptions: true,
  },
  {
    categorySlug: "fries",
    stationName: "Fry & Sides",
    name: "Truffle Parmesan Hand-Cut Fries",
    slug: "truffle-parmesan-fries",
    description: "Double-fried Idaho russets tossed in roasted garlic rosemary sea salt, Italian white truffle oil & shaved aged Grana Padano.",
    base_price: 219,
    dietary_type: "veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: false,
    prep_time_minutes: 8,
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "fries",
    stationName: "Fry & Sides",
    name: "Loaded Chili Cheese Fries",
    slug: "loaded-chili-cheese-fries",
    description: "Golden crispy fries smothered in slow-simmered smoky chili, warm cheddar queso, pickled jalapeño coins & spring onions.",
    base_price: 269,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: true,
    prep_time_minutes: 9,
    image_url: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "wings-tenders",
    stationName: "Burger & Grill",
    name: "Smoky Hickory BBQ Wings (6 Pcs)",
    slug: "smoky-bbq-wings",
    description: "Crispy double-cooked chicken wings tossed in rich smoked hickory molasses glaze, served with buttermilk ranch & celery spears.",
    base_price: 329,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 12,
    image_url: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "sandwiches",
    stationName: "Burger & Grill",
    name: "Philly Cheesesteak Sourdough Melt",
    slug: "philly-cheesesteak-melt",
    description: "Thinly shaved tender steak, grilled bell peppers, sweet caramelized onions & melted provolone on toasted sourdough.",
    base_price: 349,
    dietary_type: "non-veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 11,
    image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "appetizers",
    stationName: "Fry & Sides",
    name: "Crispy Mozzarella Sticks",
    slug: "crispy-mozzarella-sticks",
    description: "Golden panko-crusted whole milk mozzarella logs with herbaceous marinara dipping sauce.",
    base_price: 249,
    dietary_type: "veg",
    is_popular: false,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 8,
    image_url: "https://images.unsplash.com/photo-1548340748-6d2b7d7da280?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "shakes",
    stationName: "Bar & Shakes",
    name: "Belgian Dark Chocolate Gelato Shake",
    slug: "belgian-dark-chocolate-shake",
    description: "Rich 70% dark chocolate gelato churned thick with chilled whole cream, cocoa nibs & topped with toasted marshmallow fluff.",
    base_price: 249,
    dietary_type: "veg",
    is_popular: true,
    is_featured: true,
    is_chef_special: false,
    prep_time_minutes: 6,
    image_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "beverages",
    stationName: "Bar & Shakes",
    name: "Sparkling Basil Passionfruit Cooler",
    slug: "sparkling-basil-passionfruit",
    description: "Cold-pressed passionfruit puree, hand-bruised garden basil, fresh lime juice & chilled sparkling club soda.",
    base_price: 189,
    dietary_type: "veg",
    is_popular: true,
    is_featured: false,
    is_chef_special: false,
    prep_time_minutes: 5,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
  },
  {
    categorySlug: "desserts",
    stationName: "Dessert Station",
    name: "Warm Skillet Cookie & Vanilla Gelato",
    slug: "warm-skillet-cookie",
    description: "Freshly baked gooey chocolate chip skillet cookie, topped with Madagascar bourbon vanilla bean gelato & salted caramel drizzle.",
    base_price: 299,
    dietary_type: "egg",
    is_popular: true,
    is_featured: true,
    is_chef_special: true,
    prep_time_minutes: 8,
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
    name: "Boston & Co. — American Eatery",
    description:
      "Handcrafted double smash burgers, stone-baked pizzas, loaded truffle fries, and thick gelato shakes crafted fresh for dine-in.",
    logo_url: "/images/boston-logo.svg",
    cover_image_url:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    currency: "INR",
    timezone: "Asia/Kolkata",
    tax_rate: 5,
    service_charge_rate: 0,
    phone: "+91 98765 43210",
    email: "hospitality@bostonandco.in",
    address: "Boston & Co. American Eatery — Flagship Dining Room",
    opening_hours: {
      "Mon – Sun": "11:00 AM – 11:30 PM",
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
