"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  Phone,
  MapPin,
  Receipt,
  Sparkles,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  UtensilsCrossed,
  X,
  Banknote,
} from "lucide-react";
import {
  Category,
  OptionGroup,
  Product,
  ProductVariant,
  RestaurantPublicProfile,
} from "@/types/menu";
import { CartItem, SelectedOption } from "@/types/cart";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { roundCurrency } from "@/lib/pricing/calculator";
import { createClient } from "@/lib/supabase/client";
import { BostonLogo } from "@/components/shared/boston-logo";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingHeroDecorations } from "./floating-decorations";
import { BackToTopButton } from "./back-to-top-button";

interface SessionOrderItem {
  id: string;
  order_number: string;
  public_token: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
}

interface CustomerMenuViewProps {
  restaurant: RestaurantPublicProfile;
  categories: Category[];
  products: Product[];
  tableContext?: {
    tableId: string;
    tableNumber: string;
    tableLabel?: string | null;
    sessionId: string;
    sessionToken: string;
  } | null;
  isDemoPreview?: boolean;
}

export function CustomerMenuView({
  restaurant,
  categories,
  products,
  tableContext,
  isDemoPreview = false,
}: CustomerMenuViewProps) {
  const router = useRouter();
  const currency = restaurant.currency || "INR";

  // Filtering & Navigation State
  const [searchQuery, setSearchQuery] = useState("");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );

  // Cart State (persisted per table session in localStorage)
  const storageKey = `tabletap_cart_${tableContext?.tableId ?? "browse"}`;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  // Product Customization Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string[]>>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [customizerError, setCustomizerError] = useState<string | null>(null);

  // Table Bill / Session Orders Modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionOrders, setSessionOrders] = useState<SessionOrderItem[]>([]);
  const [billRequested, setBillRequested] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);
  const [demoOrderPlaced, setDemoOrderPlaced] = useState<{
    orderNumber: string;
    total: number;
  } | null>(null);

  // Load persisted cart on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      // Ignore invalid local storage state
    }
  }, [storageKey]);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart, storageKey]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (dietFilter === "veg" && p.dietary_type !== "veg" && p.dietary_type !== "vegan") {
        return false;
      }
      if (dietFilter === "non-veg" && p.dietary_type !== "non-veg") {
        return false;
      }
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = (p.description ?? "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [products, searchQuery, dietFilter]);

  const featuredProducts = useMemo(
    () => products.filter((p) => p.active && (p.is_featured || p.is_popular)).slice(0, 8),
    [products]
  );

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const cat of categories) {
      const items = filteredProducts.filter((p) => p.category_id === cat.id);
      if (items.length > 0) {
        map.set(cat.id, items);
      }
    }
    return map;
  }, [categories, filteredProducts]);

  // Open Product Detail & Customizer
  function openProductModal(product: Product) {
    setSelectedProduct(product);
    setCustomizerError(null);
    setItemQuantity(1);
    setItemNotes("");

    const defaultVar =
      product.variants?.find((v) => v.active && v.available && v.is_default) ??
      product.variants?.find((v) => v.active && v.available) ??
      null;
    setSelectedVariant(defaultVar);

    const initialOptions: Record<string, string[]> = {};
    for (const group of product.option_groups ?? []) {
      const defaults = group.options
        .filter((o) => o.active && o.is_default)
        .map((o) => o.id);
      if (defaults.length > 0) {
        initialOptions[group.id] = defaults.slice(0, group.max_select);
      } else if (group.required && group.options.length > 0) {
        const firstActive = group.options.find((o) => o.active);
        initialOptions[group.id] = firstActive ? [firstActive.id] : [];
      } else {
        initialOptions[group.id] = [];
      }
    }
    setSelectedOptionIds(initialOptions);
  }

  function toggleOptionValue(group: OptionGroup, valueId: string) {
    setCustomizerError(null);
    setSelectedOptionIds((prev) => {
      const current = prev[group.id] ?? [];
      if (group.max_select === 1) {
        if (current.includes(valueId) && !group.required && group.min_select === 0) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [valueId] };
      }

      if (current.includes(valueId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== valueId) };
      }

      if (current.length >= group.max_select) {
        setCustomizerError(
          `You can select up to ${group.max_select} option(s) for ${group.name}.`
        );
        return prev;
      }

      return { ...prev, [group.id]: [...current, valueId] };
    });
  }

  // Calculate dynamic customizer unit price
  const currentUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const base = selectedVariant
      ? Number(selectedVariant.price)
      : Number(selectedProduct.base_price);
    let delta = 0;
    for (const group of selectedProduct.option_groups ?? []) {
      const chosen = selectedOptionIds[group.id] ?? [];
      for (const opt of group.options) {
        if (chosen.includes(opt.id)) {
          delta += Number(opt.price_delta);
        }
      }
    }
    return roundCurrency(base + delta);
  }, [selectedProduct, selectedVariant, selectedOptionIds]);

  function handleAddToCart() {
    if (!selectedProduct) return;

    // Validate required option groups
    const selectedOpts: SelectedOption[] = [];
    for (const group of selectedProduct.option_groups ?? []) {
      const chosen = selectedOptionIds[group.id] ?? [];
      const effectiveMin = group.required ? Math.max(1, group.min_select) : group.min_select;
      if (chosen.length < effectiveMin) {
        setCustomizerError(
          `Please select at least ${effectiveMin} option(s) for ${group.name}.`
        );
        return;
      }
      for (const opt of group.options) {
        if (chosen.includes(opt.id)) {
          selectedOpts.push({
            optionGroupId: group.id,
            optionGroupName: group.name,
            optionValueId: opt.id,
            optionValueName: opt.name,
            priceDelta: Number(opt.price_delta),
          });
        }
      }
    }

    const sortedOptIds = selectedOpts.map((o) => o.optionValueId).sort().join(",");
    const trimmedNote = itemNotes.trim();
    const cartKey = `${selectedProduct.id}::${selectedVariant?.id ?? "base"}::${sortedOptIds}::${trimmedNote}`;
    const basePrice = selectedVariant
      ? Number(selectedVariant.price)
      : Number(selectedProduct.base_price);

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartKey);
      if (existing) {
        const nextQty = Math.min(50, existing.quantity + itemQuantity);
        return prev.map((item) =>
          item.id === cartKey
            ? {
                ...item,
                quantity: nextQty,
                totalPrice: roundCurrency(item.unitPrice * nextQty),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: cartKey,
          productId: selectedProduct.id,
          variantId: selectedVariant?.id ?? null,
          variantName: selectedVariant?.name ?? null,
          name: selectedProduct.name,
          dietaryType: selectedProduct.dietary_type,
          basePrice,
          unitPrice: currentUnitPrice,
          quantity: itemQuantity,
          totalPrice: roundCurrency(currentUnitPrice * itemQuantity),
          selectedOptions: selectedOpts,
          notes: trimmedNote || undefined,
          imageUrl: selectedProduct.image_url,
        },
      ];
    });

    setSelectedProduct(null);
  }

  function updateCartQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            totalPrice: roundCurrency(item.unitPrice * nextQty),
          };
        })
        .filter((item): item is CartItem => item !== null)
    );
  }

  // Cart Summary Calculations (mirroring server canonical rates for preview)
  const cartSummary = useMemo(() => {
    const subtotal = roundCurrency(
      cart.reduce((sum, item) => sum + item.totalPrice, 0)
    );
    const tax = roundCurrency(subtotal * ((restaurant.tax_rate || 0) / 100));
    const serviceCharge = roundCurrency(
      subtotal * ((restaurant.service_charge_rate || 0) / 100)
    );
    const total = roundCurrency(subtotal + tax + serviceCharge);
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, tax, serviceCharge, total, totalItemsCount };
  }, [cart, restaurant.tax_rate, restaurant.service_charge_rate]);

  async function handleSubmitOrder() {
    if (cart.length === 0) return;
    setOrderError(null);

    if (isDemoPreview) {
      setDemoOrderPlaced({
        orderNumber: "TT-DEMO-104",
        total: cartSummary.total,
      });
      setCart([]);
      setCartOpen(false);
      return;
    }

    if (!tableContext?.sessionToken) {
      setOrderError(
        "You are in Browse-Only mode. Please scan your table's QR code to submit a dine-in order."
      );
      return;
    }

    setSubmittingOrder(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: tableContext.sessionToken,
          idempotencyKey,
          customerNotes: customerNotes.trim() || null,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            optionValueIds: item.selectedOptions.map((o) => o.optionValueId),
            notes: item.notes ?? null,
          })),
        }),
      });

      const payload = (await response.json()) as {
        public_token?: string;
        error?: string;
      };

      if (!response.ok || !payload.public_token) {
        setOrderError(payload.error ?? "Unable to place order. Please review your items.");
        setSubmittingOrder(false);
        return;
      }

      // Clear cart and rotate idempotency key for any future order
      setCart([]);
      setCustomerNotes("");
      setCartOpen(false);
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        setIdempotencyKey(crypto.randomUUID());
      }
      router.push(`/order/${payload.public_token}`);
    } catch {
      setOrderError("Network error submitting order. Please try again—duplicate submissions are safely protected.");
      setSubmittingOrder(false);
    }
  }

  async function openSessionSummary() {
    setSessionModalOpen(true);
    if (isDemoPreview || !tableContext?.sessionToken) return;

    setLoadingSession(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_session_orders", {
        p_session_token: tableContext.sessionToken,
      });
      const parsed = data as {
        valid?: boolean;
        bill_requested?: boolean;
        orders?: SessionOrderItem[];
      } | null;
      if (parsed?.valid) {
        setSessionOrders(parsed.orders ?? []);
        setBillRequested(Boolean(parsed.bill_requested));
      }
    } finally {
      setLoadingSession(false);
    }
  }

  async function handleRequestBill() {
    if (isDemoPreview) {
      setBillRequested(true);
      return;
    }
    if (!tableContext?.sessionToken) return;
    setRequestingBill(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc("request_table_bill", {
        p_session_token: tableContext.sessionToken,
      });
      const res = data as { success?: boolean } | null;
      if (res?.success) {
        setBillRequested(true);
      }
    } finally {
      setRequestingBill(false);
    }
  }

  function scrollToCategory(catId: string) {
    setActiveCategoryId(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    const pill = document.getElementById(`cat-pill-${catId}`);
    if (pill) {
      pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-36 text-forest-950">
      {/* Demo / Browse-Only Mode Banner */}
      {isDemoPreview && (
        <div className="bg-spice-500 px-4 py-2 text-center text-xs font-semibold text-white">
          Interactive UI Preview Mode (Sample Menu Data) — Scan a live table QR code in production for real-time kitchen sync.
        </div>
      )}

      {!restaurant.is_accepting_orders && (
        <div className="bg-tomato-600 px-4 py-2.5 text-center text-xs font-semibold text-white">
          {restaurant.name} is currently closed and not accepting online table orders right now.
        </div>
      )}

      {/* Restaurant Editorial Hero Header */}
      <header className="relative overflow-hidden border-b border-cream-200 bg-white">
        <FloatingHeroDecorations />

        {restaurant.cover_image_url && (
          <div className="relative h-36 w-full overflow-hidden sm:h-56">
            <Image
              src={restaurant.cover_image_url}
              alt={restaurant.name}
              fill
              unoptimized
              sizes="100vw"
              className="object-cover transition-transform duration-1000 ease-out hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/30 to-transparent" />
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col min-[420px]:flex-row items-start gap-3 min-[420px]:gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative flex h-14 w-auto min-[420px]:h-16 shrink-0 items-center justify-center rounded-2xl border border-cream-200 bg-burgundy-900 px-3 py-2 text-cream-50 shadow-md"
              >
                <BostonLogo variant="light" size="sm" className="h-7 min-[420px]:h-8 w-auto" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <h1 className="font-serif text-xl min-[420px]:text-2xl font-bold tracking-tight text-espresso-950 sm:text-3xl">
                    {restaurant.name}
                  </h1>
                  {tableContext ? (
                    <Badge className="bg-burgundy-800 text-cream-50 font-semibold px-2.5 py-0.5 text-xs">
                      Table {tableContext.tableNumber}
                    </Badge>
                  ) : isDemoPreview ? (
                    <Badge variant="spice">Preview Table 04</Badge>
                  ) : (
                    <Badge variant="secondary">Browse Mode</Badge>
                  )}
                </motion.div>
                {restaurant.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    className="mt-1 max-w-2xl text-xs sm:text-sm text-forest-800/80 line-clamp-2 sm:line-clamp-none"
                  >
                    {restaurant.description}
                  </motion.p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-forest-700">
                  {restaurant.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[240px] sm:max-w-none">{restaurant.address}</span>
                    </span>
                  )}
                  {restaurant.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {restaurant.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(tableContext || isDemoPreview) && (
              <Button
                variant="outline"
                size="sm"
                onClick={openSessionSummary}
                className="w-full min-[420px]:w-auto self-start sm:self-end border-forest-700/30 text-forest-900 h-9 transition-transform active:scale-95"
              >
                <Receipt className="mr-1.5 h-4 w-4 text-forest-700" />
                <span>Table Bill &amp; Orders</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Demo confirmation alert */}
      {demoOrderPlaced && (
        <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <div>
                <div className="text-sm font-bold">
                  Preview Order {demoOrderPlaced.orderNumber} Simulated ({formatCurrency(demoOrderPlaced.total, currency)})
                </div>
                <div className="text-xs text-emerald-800">
                  In production with Supabase connected, this dispatches live to the Kitchen Display and opens the Live Order Tracker.
                </div>
              </div>
            </div>
            <button onClick={() => setDemoOrderPlaced(null)}>
              <X className="h-4 w-4 text-emerald-700" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Search, Dietary Filters & Category Strip */}
      <div className="sticky top-0 z-30 border-b border-cream-200/90 bg-cream-50/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3.5 py-2.5 sm:px-6 sm:py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-700/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pizzas, burgers, pasta..."
                className="pl-9 h-9 sm:h-10 text-xs sm:text-sm bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
              <button
                onClick={() => setDietFilter("all")}
                className={cn(
                  "shrink-0 rounded-full px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold transition-colors",
                  dietFilter === "all"
                    ? "bg-forest-800 text-white"
                    : "bg-white border border-cream-300 text-forest-800 hover:bg-cream-100"
                )}
              >
                All Menu
              </button>
              <button
                onClick={() => setDietFilter("veg")}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold transition-colors",
                  dietFilter === "veg"
                    ? "bg-emerald-700 text-white"
                    : "bg-white border border-cream-300 text-forest-800 hover:bg-emerald-50"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Pure Veg</span>
              </button>
              <button
                onClick={() => setDietFilter("non-veg")}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold transition-colors",
                  dietFilter === "non-veg"
                    ? "bg-tomato-600 text-white"
                    : "bg-white border border-cream-300 text-forest-800 hover:bg-tomato-50"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-tomato-500" />
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Horizontal Category Pills */}
          <div className="mt-2.5 flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x scroll-smooth">
            {categories.map((cat) => {
              const hasItems = productsByCategory.has(cat.id);
              if (!hasItems) return null;
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-pill-${cat.id}`}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "relative shrink-0 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors duration-200 z-10",
                    isActive
                      ? "text-cream-50"
                      : "text-forest-900 bg-cream-200/60 hover:bg-cream-200 hover:text-forest-950"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeCategoryIndicator"
                      className="absolute inset-0 rounded-lg bg-forest-900 shadow-sm -z-10"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Menu Body */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Featured / Chef Specials Horizontal Highlight */}
        {!searchQuery && dietFilter === "all" && featuredProducts.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-spice-500" />
              <h2 className="font-serif text-2xl font-bold text-forest-950">
                Chef&apos;s Featured &amp; Popular
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map((product) => {
                const inCartCount = cart
                  .filter((i) => i.productId === product.id)
                  .reduce((acc, i) => acc + i.quantity, 0);

                return (
                  <motion.div
                    key={`feat-${product.id}`}
                    whileHover={
                      product.available
                        ? { y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }
                        : undefined
                    }
                    onClick={() => product.available && openProductModal(product)}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-shadow hover:shadow-md",
                      !product.available && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="relative h-36 w-full bg-cream-100 overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, 320px"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-forest-700/40">
                          <UtensilsCrossed className="h-8 w-8" />
                        </div>
                      )}
                      {product.is_chef_special && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-spice-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                          Chef&apos;s Special
                        </span>
                      )}
                      <AnimatePresence>
                        {inCartCount > 0 && (
                          <motion.span
                            key={`incart-feat-${product.id}-${inCartCount}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 450, damping: 22 }}
                            className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-burgundy-900 px-1.5 text-[11px] font-bold text-cream-50 shadow-md ring-2 ring-white"
                          >
                            {inCartCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <DietaryBadge type={product.dietary_type} />
                        <span className="text-sm font-bold text-forest-950">
                          {formatCurrency(product.base_price, currency)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-serif text-base font-bold text-forest-950 line-clamp-1 group-hover:text-burgundy-900 transition-colors">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-xs text-forest-700/80 line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Categorized Sections */}
        {categories.map((cat) => {
          const catProducts = productsByCategory.get(cat.id);
          if (!catProducts || catProducts.length === 0) return null;

          return (
            <section
              key={cat.id}
              id={`cat-${cat.id}`}
              className="mb-12 scroll-mt-36"
            >
              <div className="mb-5 border-b border-cream-200 pb-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
                    {cat.name}
                  </h2>
                  <span className="text-xs font-medium text-forest-700">
                    {catProducts.length} {catProducts.length === 1 ? "dish" : "dishes"}
                  </span>
                </div>
                {cat.description && (
                  <p className="mt-1 text-sm text-forest-700/80">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {catProducts.map((product) => {
                  const hasCustomizations =
                    (product.variants && product.variants.length > 0) ||
                    (product.option_groups && product.option_groups.length > 0);
                  const inCartCount = cart
                    .filter((i) => i.productId === product.id)
                    .reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <motion.div
                      key={product.id}
                      whileHover={
                        product.available
                          ? { y: -2, transition: { duration: 0.2 } }
                          : undefined
                      }
                      onClick={() => product.available && openProductModal(product)}
                      className={cn(
                        "group relative flex gap-3 sm:gap-4 rounded-2xl border border-cream-200/90 bg-white p-3 sm:p-4 shadow-sm transition-all",
                        product.available
                          ? "cursor-pointer hover:border-forest-700/30 hover:shadow-md"
                          : "opacity-65 cursor-not-allowed"
                      )}
                    >
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <DietaryBadge type={product.dietary_type} />
                            {product.is_popular && (
                              <span className="rounded bg-spice-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-spice-800">
                                Popular
                              </span>
                            )}
                            {!product.available && (
                              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                                Sold Out
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1 font-serif text-sm min-[380px]:text-base sm:text-lg font-bold text-forest-950 line-clamp-1 min-[420px]:line-clamp-2 group-hover:text-burgundy-900 transition-colors">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-forest-800/75 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-sm min-[380px]:text-base font-bold text-forest-950">
                              {formatCurrency(product.base_price, currency)}
                            </span>
                            {product.variants && product.variants.length > 0 && (
                              <span className="ml-1 text-[10px] min-[380px]:text-[11px] text-forest-700/70">
                                onwards
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={product.available ? "default" : "secondary"}
                            disabled={!product.available}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (product.available) openProductModal(product);
                            }}
                            className="h-8 px-2.5 sm:px-3 text-xs shrink-0 font-semibold transition-transform active:scale-95"
                          >
                            {!product.available
                              ? "Unavailable"
                              : hasCustomizations
                              ? "Customize +"
                              : "Add +"}
                          </Button>
                        </div>
                      </div>

                      <div className="relative h-20 w-20 min-[380px]:h-24 min-[380px]:w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 96px, 112px"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-forest-700/30">
                            <UtensilsCrossed className="h-6 w-6 sm:h-7 sm:w-7" />
                          </div>
                        )}
                        <AnimatePresence>
                          {inCartCount > 0 && (
                            <motion.span
                              key={`incart-${product.id}-${inCartCount}`}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              className="absolute top-1.5 right-1.5 flex h-5 min-w-5 sm:h-6 sm:min-w-6 items-center justify-center rounded-full bg-burgundy-900 px-1 text-[10px] sm:text-[11px] font-bold text-cream-50 shadow-md ring-2 ring-white"
                            >
                              {inCartCount}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white py-16 text-center">
            <ChefHat className="mx-auto h-10 w-10 text-forest-700/40" />
            <h3 className="mt-3 font-serif text-xl font-bold text-forest-950">
              No dishes match your filter
            </h3>
            <p className="mt-1 text-sm text-forest-700">
              Try clearing your search or switching dietary filters.
            </p>
          </div>
        )}
      </main>

      {/* Desktop Floating Cart Pill (lg screens) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="hidden lg:flex fixed bottom-8 right-8 z-40 items-center pointer-events-auto"
          >
            <button
              onClick={() => setCartOpen(true)}
              aria-label="View shopping cart and checkout"
              className="group flex items-center gap-3.5 rounded-full bg-burgundy-900 text-cream-50 pl-4 pr-5 py-3 shadow-2xl hover:bg-burgundy-950 transition-all hover:scale-105 active:scale-95 border border-burgundy-700/50"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 text-cream-100 group-hover:rotate-6 transition-transform" />
                <motion.span
                  key={cartSummary.totalItemsCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-spice-500 text-[11px] font-extrabold text-white ring-2 ring-burgundy-900 shadow-sm"
                >
                  {cartSummary.totalItemsCount}
                </motion.span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cream-200">
                  {tableContext ? `Table ${tableContext.tableNumber}` : "Your Cart"}
                </span>
                <span className="text-sm font-bold leading-tight">
                  {formatCurrency(cartSummary.total, currency)}
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Cart Bar (Mobile & Tablet) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-cream-200 bg-white/95 p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2.5 sm:gap-4 rounded-xl bg-forest-900 px-3.5 sm:px-4 py-2.5 sm:py-3 text-cream-50 shadow-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-cream-200">
                  <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                  <motion.span
                    key={cartSummary.totalItemsCount}
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 450, damping: 18 }}
                    className="truncate"
                  >
                    {cartSummary.totalItemsCount}{" "}
                    {cartSummary.totalItemsCount === 1 ? "item" : "items"}
                    {tableContext ? ` • T-${tableContext.tableNumber}` : ""}
                  </motion.span>
                </div>
                <div className="text-sm min-[380px]:text-base font-bold truncate">
                  {formatCurrency(cartSummary.total, currency)}{" "}
                  <span className="text-[10px] sm:text-[11px] font-normal text-cream-200/80">
                    (incl. taxes)
                  </span>
                </div>
              </div>

              <Button
                variant="spice"
                onClick={() => setCartOpen(true)}
                className="px-3.5 sm:px-5 text-xs sm:text-sm font-bold shrink-0 h-9 sm:h-10 transition-transform active:scale-95 shadow"
              >
                View Cart &amp; Order
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Customizer Modal */}
      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        {selectedProduct && (
          <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
            {selectedProduct.image_url && (
              <div className="relative h-36 sm:h-48 w-full bg-cream-100 shrink-0">
                <Image
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DietaryBadge type={selectedProduct.dietary_type} showLabel />
                  <span className="inline-flex items-center gap-1 text-xs text-forest-700">
                    <Clock className="h-3.5 w-3.5" />
                    ~{selectedProduct.prep_time_minutes} mins
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl mt-1">
                  {selectedProduct.name}
                </DialogTitle>
                {selectedProduct.description && (
                  <DialogDescription className="text-xs sm:text-sm">
                    {selectedProduct.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {customizerError && (
                <div className="flex items-start gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-xs text-tomato-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
                  <span>{customizerError}</span>
                </div>
              )}

              {/* Variants (Sizes / Portions) */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-forest-950">
                      Select Size / Option
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Required
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedProduct.variants
                      .filter((v) => v.active && v.available)
                      .map((variant) => {
                        const active = selectedVariant?.id === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            className={cn(
                              "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-all",
                              active
                                ? "border-forest-800 bg-forest-50 font-semibold text-forest-950 ring-1 ring-forest-800"
                                : "border-cream-300 bg-white hover:bg-cream-50"
                            )}
                          >
                            <span>{variant.name}</span>
                            <span>{formatCurrency(variant.price, currency)}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Customization Option Groups */}
              {(selectedProduct.option_groups ?? [])
                .filter((g) => g.active)
                .map((group) => {
                  const chosen = selectedOptionIds[group.id] ?? [];
                  return (
                    <div key={group.id} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-forest-950">
                            {group.name}
                          </span>
                          {group.description && (
                            <p className="text-xs text-forest-700/75">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={group.required ? "spice" : "secondary"}
                          className="text-[10px]"
                        >
                          {group.required
                            ? `Required • Choose ${group.max_select}`
                            : `Optional • Up to ${group.max_select}`}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {group.options
                          .filter((o) => o.active)
                          .map((opt) => {
                            const isChecked = chosen.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleOptionValue(group, opt.id)}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all",
                                  isChecked
                                    ? "border-forest-800 bg-forest-50/80 font-medium text-forest-950"
                                    : "border-cream-200 bg-white hover:bg-cream-50"
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span
                                    className={cn(
                                      "flex h-4 w-4 items-center justify-center border",
                                      group.max_select === 1
                                        ? "rounded-full"
                                        : "rounded",
                                      isChecked
                                        ? "border-forest-800 bg-forest-800 text-white"
                                        : "border-cream-400"
                                    )}
                                  >
                                    {isChecked && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                  </span>
                                  <span>{opt.name}</span>
                                </span>
                                <span className="text-xs font-semibold text-forest-800">
                                  {opt.price_delta > 0
                                    ? `+${formatCurrency(opt.price_delta, currency)}`
                                    : "Included"}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}

              {/* Special Kitchen Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-forest-700">
                  Special Preparation Instructions (Optional)
                </label>
                <Textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g., Extra crispy, no onions, serve sauce on the side..."
                  maxLength={200}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* Sticky Bottom Quantity & Add Action */}
            <div className="sticky bottom-0 border-t border-cream-200 bg-white/95 p-3.5 sm:p-5 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center rounded-xl border border-cream-300 bg-cream-50">
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 sm:p-2.5 text-forest-900 hover:bg-cream-200 rounded-l-xl touch-manipulation"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-7 sm:w-8 text-center text-sm font-bold">
                  {itemQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.min(50, q + 1))}
                  className="p-2 sm:p-2.5 text-forest-900 hover:bg-cream-200 rounded-r-xl touch-manipulation"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                className="flex-1 h-11 text-xs sm:text-sm font-bold"
                onClick={handleAddToCart}
              >
                Add to Cart •{" "}
                {formatCurrency(
                  roundCurrency(currentUnitPrice * itemQuantity),
                  currency
                )}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Cart & Checkout Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg p-4 sm:p-6 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-serif text-xl sm:text-2xl">
              Your Table Order
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {tableContext
                ? `Ordering directly for Table ${tableContext.tableNumber} at ${restaurant.name}`
                : isDemoPreview
                ? "Interactive Preview Cart — Submit to simulate order confirmation"
                : "Browse mode — scan your table QR code to enable dine-in checkout"}
            </DialogDescription>
          </DialogHeader>

          {orderError && (
            <div className="flex items-start gap-2 rounded-lg border border-tomato-200 bg-tomato-50 p-3 text-xs sm:text-sm text-tomato-800 shrink-0">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
              <span>{orderError}</span>
            </div>
          )}

          {!tableContext && !isDemoPreview && (
            <div className="flex items-start gap-3 rounded-xl border border-spice-200 bg-spice-50 p-3 text-xs text-spice-900 shrink-0">
              <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-spice-600" />
              <span>
                Table verification required: Please scan the QR code on your physical table so your order routes accurately to your table.
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2.5 sm:gap-3 rounded-xl border border-cream-200 bg-cream-50/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <DietaryBadge type={item.dietaryType} />
                      <span className="font-semibold text-xs sm:text-sm text-forest-950 truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.variantName && (
                      <div className="mt-0.5 text-xs text-forest-700 font-medium">
                        Size: {item.variantName}
                      </div>
                    )}
                    {item.selectedOptions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.selectedOptions.map((opt) => (
                          <span
                            key={opt.optionValueId}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] border border-cream-200 text-forest-800"
                          >
                            {opt.optionValueName}
                            {opt.priceDelta > 0
                              ? ` (+${formatCurrency(opt.priceDelta, currency)})`
                              : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-[11px] italic text-forest-700">
                        Note: &ldquo;{item.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-forest-950">
                      {formatCurrency(item.totalPrice, currency)}
                    </span>
                    <div className="flex items-center gap-0.5 rounded-lg border border-cream-300 bg-white">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 sm:p-1.5 text-forest-800 hover:bg-cream-100 rounded-l-lg touch-manipulation"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3.5 w-3.5 text-tomato-600" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <span className="w-5 sm:w-6 text-center text-xs font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 sm:p-1.5 text-forest-800 hover:bg-cream-100 rounded-r-lg touch-manipulation"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-forest-700">
                Kitchen Order Notes (Optional)
              </label>
              <Input
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Allergies, cutlery request, or serve together..."
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Bill Breakdown */}
            <div className="space-y-1.5 rounded-xl border border-cream-200 bg-cream-50 p-3.5 sm:p-4 text-xs sm:text-sm">
              <div className="flex justify-between text-forest-800">
                <span>Item Subtotal</span>
                <span>{formatCurrency(cartSummary.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-forest-800">
                <span>Taxes ({restaurant.tax_rate}%)</span>
                <span>{formatCurrency(cartSummary.tax, currency)}</span>
              </div>
              {restaurant.service_charge_rate > 0 && (
                <div className="flex justify-between text-forest-800">
                  <span>Service Charge ({restaurant.service_charge_rate}%)</span>
                  <span>{formatCurrency(cartSummary.serviceCharge, currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream-200 pt-2 text-sm sm:text-base font-bold text-forest-950">
                <span>Total Amount</span>
                <span>{formatCurrency(cartSummary.total, currency)}</span>
              </div>
            </div>

            {/* Offline Payment Information */}
            <div className="flex items-start gap-2.5 rounded-xl border border-cream-200/90 bg-cream-100/70 p-3 text-xs text-forest-900">
              <Banknote className="mt-0.5 h-4 w-4 text-burgundy-700 shrink-0" />
              <div>
                <div className="font-semibold text-espresso-950">Pay at the restaurant</div>
                <div className="text-[11px] sm:text-xs text-espresso-700/80 mt-0.5">
                  No online payment required now. Settle your bill via Cash, UPI, or Card at your table or counter after dining.
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-3 border-t border-cream-100">
            <Button
              size="lg"
              className="w-full font-bold h-11 sm:h-12 text-sm sm:text-base"
              onClick={handleSubmitOrder}
              disabled={
                submittingOrder ||
                cart.length === 0 ||
                !restaurant.is_accepting_orders ||
                (!tableContext && !isDemoPreview)
              }
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Sending to Kitchen...</span>
                </>
              ) : (
                <span>
                  Place Order • {formatCurrency(cartSummary.total, currency)}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Session Summary & Request Bill Dialog */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Table {tableContext?.tableNumber ?? "04"} Session Summary
            </DialogTitle>
            <DialogDescription>
              All orders placed during this table&apos;s current dining session
            </DialogDescription>
          </DialogHeader>

          {loadingSession ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-forest-800" />
            </div>
          ) : sessionOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-forest-700">
              No orders submitted in this session yet.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {sessionOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => {
                    setSessionModalOpen(false);
                    router.push(`/order/${ord.public_token}`);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-cream-200 p-3 hover:bg-cream-50"
                >
                  <div>
                    <div className="font-mono text-sm font-bold text-forest-950">
                      {ord.order_number}
                    </div>
                    <div className="text-xs capitalize text-forest-700">
                      Status: {ord.status} • Payment: {ord.payment_status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {formatCurrency(ord.total, currency)}
                    </div>
                    <div className="text-[11px] text-forest-700 underline">
                      Track →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-cream-200 pt-4">
            {billRequested ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <span>Bill requested! A staff member will bring your receipt shortly.</span>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-forest-800 text-forest-900 hover:bg-forest-50 font-semibold"
                onClick={handleRequestBill}
                disabled={requestingBill}
              >
                {requestingBill ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                <span>Request Table Bill</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Back To Top Button */}
      <BackToTopButton />
    </div>
  );
}
