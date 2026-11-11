import { DietaryType } from "./menu";

export interface SelectedOption {
  optionGroupId: string;
  optionGroupName: string;
  optionValueId: string;
  optionValueName: string;
  priceDelta: number;
}

export interface CartItem {
  id: string; // Deterministic hash of product + variant + sorted option IDs + notes
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  name: string;
  dietaryType: DietaryType;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  imageUrl?: string | null;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  totalItemsCount: number;
}
