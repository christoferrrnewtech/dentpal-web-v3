export interface ProductVariant {
  key: string; 
  options: Record<string, string>;
  price: number;
  stock: number;
  sku?: string;
  specialPrice?: number;
  available?: boolean;
  imageUrl?: string;
}

export type InventoryStatus = 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';

export interface InventoryItem {
  id: string;
  name: string;
  suggestedThreshold: number; 
  inStock: number;            
  unit?: string;              
  updatedAt: number;          

  description?: string;
  imageUrl?: string;
  category?: string;
  subcategory?: string;
  variations?: string[]; 
  price?: number; 

  specialPrice?: number;

  promoStart?: number | null;
  promoEnd?: number | null;

  status?: InventoryStatus;
  sku?: string; 
  weight?: number; 
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  available?: boolean; 
  preOrder?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  qcReason?: string;
}

export interface StockAdjustmentDraft {
  itemId: string | null;
  delta: number; 
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
