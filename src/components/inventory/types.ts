export interface InventoryItem {
  id: string;
  name: string;
  suggestedThreshold: number; // recommended minimum stock
  inStock: number;            // current stock
  unit?: string;              // optional unit (pcs, box, etc.)
  updatedAt: number;          // epoch ms
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
