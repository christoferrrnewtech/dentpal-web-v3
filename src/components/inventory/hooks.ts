import { useMemo, useState } from 'react';
import { InventoryItem, StockAdjustmentDraft, DEFAULT_ADJUSTMENT } from './types';

export function useInventory(items: InventoryItem[]) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<StockAdjustmentDraft>(DEFAULT_ADJUSTMENT);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  }, [items, query]);

  const selectItem = (id: string) => setDraft(d => ({ ...d, itemId: id }));
  const setDelta = (delta: number) => setDraft(d => ({ ...d, delta }));
  const setReason = (reason: string | null) => setDraft(d => ({ ...d, reason }));
  const resetDraft = () => setDraft(DEFAULT_ADJUSTMENT);

  return { query, setQuery, draft, selectItem, setDelta, setReason, resetDraft, filtered };
}
