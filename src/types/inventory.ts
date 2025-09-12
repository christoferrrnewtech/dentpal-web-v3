export interface InventoryItem {
  id: string;
  itemName: string;
  sku: string;
  stockCount: number;
  suggestedThreshold: number;
  currentStock: number;
  stockAfter?: number;
  status: 'active' | 'low_stock' | 'stockout' | 'inactive';
  category: string;
  supplier: string;
  unitPrice: number;
  totalValue: number;
  lastUpdated: string;
  createdAt: string;
  updatedBy: string;
  description?: string;
  location?: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  date: string;
  reason: string;
  itemName: string;
  sku: string;
  stockBefore: number;
  stockAfter: number;
  adjustmentQty: number;
  adjustmentType: 'add' | 'remove' | 'adjust';
  userEditor: string;
  timestamp: string;
  notes?: string;
  category: string;
}

export interface InventoryFilters {
  dateRange?: { start: string; end: string };
  category?: string;
  supplier?: string;
  status?: string;
  reason?: string;
}

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  stockoutItems: number;
  totalValue: number;
}

export interface InventoryTabProps {
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onTabChange?: (tab: string) => void;
}
