import { OptionGroup, Product, ProductVariant } from "@/types/menu";

export interface PricingLineInput {
  product: Product;
  variant?: ProductVariant | null;
  selectedOptionValueIds: string[];
  quantity: number;
}

export interface CalculatedLineItem {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  basePrice: number;
  optionsDelta: number;
  unitPrice: number;
  lineTotal: number;
  resolvedOptions: Array<{
    groupName: string;
    valueName: string;
    priceDelta: number;
  }>;
}

export interface OrderPricingBreakdown {
  items: CalculatedLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
}

/**
 * Rounds currency calculations cleanly to 2 decimal places avoiding IEEE-754 drift.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Validates option selections against all option groups attached to a product.
 * Throws descriptive errors when required groups are missing or max limits exceeded.
 */
export function validateProductOptionSelections(
  productName: string,
  optionGroups: OptionGroup[] | undefined,
  selectedOptionValueIds: string[]
): Array<{ groupName: string; valueName: string; priceDelta: number }> {
  const groups = optionGroups ?? [];
  const selectedSet = new Set(selectedOptionValueIds);
  const resolvedOptions: Array<{
    groupName: string;
    valueName: string;
    priceDelta: number;
  }> = [];

  for (const group of groups) {
    if (!group.active) continue;

    const matchingOptions = group.options.filter(
      (opt) => opt.active && selectedSet.has(opt.id)
    );

    const effectiveMin = group.required ? Math.max(1, group.min_select) : group.min_select;

    if (matchingOptions.length < effectiveMin) {
      throw new Error(
        `Please select at least ${effectiveMin} option(s) for "${group.name}" on ${productName}.`
      );
    }

    if (matchingOptions.length > group.max_select) {
      throw new Error(
        `You can select at most ${group.max_select} option(s) for "${group.name}" on ${productName}.`
      );
    }

    for (const opt of matchingOptions) {
      resolvedOptions.push({
        groupName: group.name,
        valueName: opt.name,
        priceDelta: roundCurrency(Number(opt.price_delta)),
      });
    }
  }

  return resolvedOptions;
}

/**
 * Computes canonical line pricing and full order totals from trusted menu records.
 */
export function calculateOrderPricing(
  lines: PricingLineInput[],
  config: {
    taxRatePercent: number;
    serviceChargePercent: number;
    discountAmount?: number;
  }
): OrderPricingBreakdown {
  if (!lines.length) {
    throw new Error("Order must include at least one item.");
  }

  const calculatedItems: CalculatedLineItem[] = [];
  let subtotal = 0;

  for (const line of lines) {
    const { product, variant, selectedOptionValueIds, quantity } = line;

    if (!product.active || !product.available) {
      throw new Error(`"${product.name}" is currently unavailable.`);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error(`Invalid quantity (${quantity}) for "${product.name}". Must be between 1 and 50.`);
    }

    let basePrice = Number(product.base_price);
    let variantId: string | null = null;
    let variantName: string | null = null;

    if (variant) {
      if (variant.product_id !== product.id || !variant.active || !variant.available) {
        throw new Error(`Selected size/variant "${variant.name}" for "${product.name}" is unavailable.`);
      }
      basePrice = Number(variant.price);
      variantId = variant.id;
      variantName = variant.name;
    }

    const resolvedOptions = validateProductOptionSelections(
      product.name,
      product.option_groups,
      selectedOptionValueIds
    );

    const optionsDelta = roundCurrency(
      resolvedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0)
    );
    const unitPrice = roundCurrency(basePrice + optionsDelta);
    const lineTotal = roundCurrency(unitPrice * quantity);

    subtotal = roundCurrency(subtotal + lineTotal);

    calculatedItems.push({
      productId: product.id,
      productName: product.name,
      variantId,
      variantName,
      quantity,
      basePrice: roundCurrency(basePrice),
      optionsDelta,
      unitPrice,
      lineTotal,
      resolvedOptions,
    });
  }

  const discount = roundCurrency(
    Math.min(subtotal, Math.max(0, config.discountAmount ?? 0))
  );
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discount));
  const tax = roundCurrency(taxableAmount * (Math.max(0, config.taxRatePercent) / 100));
  const serviceCharge = roundCurrency(
    taxableAmount * (Math.max(0, config.serviceChargePercent) / 100)
  );
  const total = roundCurrency(taxableAmount + tax + serviceCharge);

  return {
    items: calculatedItems,
    subtotal,
    discount,
    tax,
    serviceCharge,
    total,
  };
}
