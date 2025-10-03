export interface ProductVariant {
  key: string; // unique key derived from option values
  options: Record<string, string>; // e.g., { Size: 'M', Color: 'Red' }
  price: number;
  stock: number;
  sku?: string;
  specialPrice?: number;
  available?: boolean;
  // New: image for this specific variant
  imageUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  suggestedThreshold: number; // recommended minimum stock
  inStock: number;            // current stock (sum of variants if hasVariants)
  unit?: string;              // optional unit (pcs, box, etc.)
  updatedAt: number;          // epoch ms
  // Catalog fields
  description?: string;
  imageUrl?: string;
  category?: string;
  subcategory?: string;
  variations?: string[]; // simple string variations e.g., sizes/colors (legacy)
  price?: number; // base price (for simple products)
  sku?: string; // base SKU (for simple products)
  weight?: number; // kg or grams (client-defined)
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  // Availability / pre-order
  available?: boolean; // simple product availability
  preOrder?: boolean;
  // Variants
  hasVariants?: boolean;
  variants?: ProductVariant[];
}

export interface StockAdjustmentDraft {
  itemId: string | null;
  delta: number; // positive add / negative remove
  reason: string | null;
}

export const DEFAULT_ADJUSTMENT: StockAdjustmentDraft = {
  itemId: null,
  delta: 0,
  reason: null,
};

export const ADJUST_REASONS = [
  'Restock',
  'Correction',
  'Damage',
  'Expiration',
  'Return',
] as const;
export type AdjustReason = typeof ADJUST_REASONS[number];
