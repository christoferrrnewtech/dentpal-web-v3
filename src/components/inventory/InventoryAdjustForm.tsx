import React from 'react';
import { ADJUST_REASONS, InventoryItem, StockAdjustmentDraft } from './types';

interface Props {
  draft: StockAdjustmentDraft;
  items: InventoryItem[];
  onChangeItem: (id: string) => void;
  onChangeDelta: (delta: number) => void;
  onChangeReason: (reason: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const InventoryAdjustForm: React.FC<Props> = ({
  draft, items, onChangeItem, onChangeDelta, onChangeReason, onSubmit, onClear, disabled
}) => {
  const selected = items.find(i => i.id === draft.itemId) || null;
  const stockAfter = selected ? selected.inStock + draft.delta : '-';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">ITEM NAME</label>
          <select
            value={draft.itemId || ''}
            onChange={e => onChangeItem(e.target.value)}
            className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Search item...</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">SUGGESTED THRESHOLD</label>
          <div className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg border border-gray-200 h-10 flex items-center px-3">{selected ? selected.suggestedThreshold : '-'}</div>
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">IN STOCK</label>
          <div className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg border border-gray-200 h-10 flex items-center px-3">{selected ? selected.inStock : '-'}</div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">DELTA</label>
          <input
            type="number"
            value={draft.delta}
            onChange={e => onChangeDelta(Number(e.target.value))}
            className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="+/-"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">REASON</label>
            <select
              value={draft.reason || ''}
              onChange={e => onChangeReason(e.target.value)}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select reason</option>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">STOCK AFTER</label>
          <div className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg border border-gray-200 h-10 flex items-center px-3">{stockAfter}</div>
        </div>
        <div className="col-span-12 flex gap-4 justify-end pt-2">
          <button
            onClick={onSubmit}
            disabled={!draft.itemId || !draft.reason || draft.delta === 0 || disabled}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-40"
          >ADJUST</button>
          <button onClick={onClear} className="text-xs font-semibold text-gray-500 hover:text-gray-700">CLEAR</button>
        </div>
      </div>
    </div>
  );
};
export default InventoryAdjustForm;
