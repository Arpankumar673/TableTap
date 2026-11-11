import { describe, expect, it } from "vitest";
import {
  calculateOrderPricing,
  roundCurrency,
  validateProductOptionSelections,
} from "../src/lib/pricing/calculator";
import { OptionGroup, Product, ProductVariant } from "../src/types/menu";

const sampleProduct: Product = {
  id: "prod-1",
  restaurant_id: "rest-1",
  category_id: "cat-1",
  station_id: "st-pizza",
  name: "Margherita Classica",
  slug: "margherita-classica",
  base_price: 399,
  dietary_type: "veg",
  is_popular: true,
  is_featured: true,
  is_chef_special: false,
  prep_time_minutes: 15,
  sort_order: 1,
  active: true,
  available: true,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  option_groups: [
    {
      id: "og-crust",
      restaurant_id: "rest-1",
      name: "Crust Choice",
      required: true,
      min_select: 1,
      max_select: 1,
      active: true,
      options: [
        {
          id: "ov-thin",
          option_group_id: "og-crust",
          name: "Thin Crust",
          price_delta: 0,
          is_default: true,
          active: true,
          sort_order: 1,
        },
        {
          id: "ov-burst",
          option_group_id: "og-crust",
          name: "Cheese Burst",
          price_delta: 89,
          is_default: false,
          active: true,
          sort_order: 2,
        },
      ],
    },
    {
      id: "og-toppings",
      restaurant_id: "rest-1",
      name: "Extra Toppings",
      required: false,
      min_select: 0,
      max_select: 2,
      active: true,
      options: [
        {
          id: "ov-cheese",
          option_group_id: "og-toppings",
          name: "Extra Cheese",
          price_delta: 49,
          is_default: false,
          active: true,
          sort_order: 1,
        },
        {
          id: "ov-olives",
          option_group_id: "og-toppings",
          name: "Black Olives",
          price_delta: 39,
          is_default: false,
          active: true,
          sort_order: 2,
        },
        {
          id: "ov-jalapeno",
          option_group_id: "og-toppings",
          name: "Jalapeños",
          price_delta: 39,
          is_default: false,
          active: true,
          sort_order: 3,
        },
      ],
    },
  ],
};

const largeVariant: ProductVariant = {
  id: "var-large",
  restaurant_id: "rest-1",
  product_id: "prod-1",
  name: "Large (12\")",
  price: 499,
  is_default: false,
  active: true,
  available: true,
  sort_order: 2,
};

describe("Canonical Order Pricing & Option Validation", () => {
  it("rounds floating-point edge values accurately to 2 decimals", () => {
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(199.994)).toBe(199.99);
  });

  it("calculates canonical variant + add-on prices, taxes, and service charge", () => {
    const result = calculateOrderPricing(
      [
        {
          product: sampleProduct,
          variant: largeVariant, // ₹499
          selectedOptionValueIds: ["ov-thin", "ov-cheese", "ov-olives"], // +0 + 49 + 39 = ₹88
          quantity: 2,
        },
      ],
      {
        taxRatePercent: 5,
        serviceChargePercent: 10,
      }
    );

    // Unit price = 499 + 88 = 587; Line total = 587 * 2 = 1174
    expect(result.items[0].unitPrice).toBe(587);
    expect(result.items[0].lineTotal).toBe(1174);
    expect(result.subtotal).toBe(1174);
    expect(result.tax).toBe(58.7);
    expect(result.serviceCharge).toBe(117.4);
    expect(result.total).toBe(1350.1);
  });

  it("rejects missing required option groups", () => {
    expect(() =>
      validateProductOptionSelections(
        sampleProduct.name,
        sampleProduct.option_groups as OptionGroup[],
        ["ov-cheese"] // Missing required og-crust selection
      )
    ).toThrow(/Crust Choice/);
  });

  it("rejects exceeding max_select on optional topping groups", () => {
    expect(() =>
      validateProductOptionSelections(
        sampleProduct.name,
        sampleProduct.option_groups as OptionGroup[],
        ["ov-thin", "ov-cheese", "ov-olives", "ov-jalapeno"] // 3 selected where max=2
      )
    ).toThrow(/at most 2/);
  });

  it("rejects sold-out products", () => {
    const soldOut: Product = { ...sampleProduct, available: false };
    expect(() =>
      calculateOrderPricing(
        [{ product: soldOut, selectedOptionValueIds: ["ov-thin"], quantity: 1 }],
        { taxRatePercent: 5, serviceChargePercent: 0 }
      )
    ).toThrow(/unavailable/);
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      calculateOrderPricing(
        [{ product: sampleProduct, selectedOptionValueIds: ["ov-thin"], quantity: 0 }],
        { taxRatePercent: 5, serviceChargePercent: 0 }
      )
    ).toThrow(/Invalid quantity/);

    expect(() =>
      calculateOrderPricing(
        [{ product: sampleProduct, selectedOptionValueIds: ["ov-thin"], quantity: 55 }],
        { taxRatePercent: 5, serviceChargePercent: 0 }
      )
    ).toThrow(/Invalid quantity/);
  });

  it("clamps discount so total never becomes negative", () => {
    const result = calculateOrderPricing(
      [{ product: sampleProduct, selectedOptionValueIds: ["ov-thin"], quantity: 1 }],
      { taxRatePercent: 5, serviceChargePercent: 0, discountAmount: 9999 }
    );
    expect(result.discount).toBe(399);
    expect(result.total).toBe(0);
  });
});
