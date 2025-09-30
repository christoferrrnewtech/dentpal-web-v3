import React, { useCallback, useState } from 'react';
import { InventoryItem } from './types';
import { useInventory } from './hooks';
import InventoryAdjustForm from './InventoryAdjustForm';
import InventoryTable from './InventoryTable';
import HistoryFilters from './HistoryFilters';
import HistoryTable from './HistoryTable';
import ListingTable from './ListingTable';
import StockoutTable from './StockoutTable';
import ActiveTable from './ActiveTable';
import StatusFilters from './StatusFilters';

interface InventoryTabProps {
  items?: InventoryItem[]; // parent can inject real data later
  loading?: boolean;
  onAdjust?: (itemId: string, delta: number, reason: string) => Promise<void> | void;
}

const mockItems: InventoryItem[] = [
  { id: 'it-1', name: 'Alginate Powder', suggestedThreshold: 5, inStock: 12, unit: 'bag', updatedAt: Date.now() - 86400000 },
  { id: 'it-2', name: 'Impression Tray Size M', suggestedThreshold: 20, inStock: 18, unit: 'pcs', updatedAt: Date.now() - 3600000 },
  { id: 'it-3', name: 'Composite A2', suggestedThreshold: 10, inStock: 7, unit: 'syringe', updatedAt: Date.now() - 7200000 },
];

const InventoryTab: React.FC<InventoryTabProps> = ({ items = mockItems, loading = false, onAdjust }) => {
  const { filtered, query, setQuery, draft, selectItem, setDelta, setReason, resetDraft } = useInventory(items);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'active' | 'stockout' | 'listing'>('add');

  const handleSubmit = useCallback(async () => {
    if (!draft.itemId || !draft.reason || draft.delta === 0) return;
    try {
      setSubmitting(true);
      await onAdjust?.(draft.itemId, draft.delta, draft.reason);
      // OPTIMISTIC: in a real app trigger refetch
      resetDraft();
    } finally {
      setSubmitting(false);
    }
  }, [draft, onAdjust, resetDraft]);

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200 pb-2">
        {['add', 'history', 'active', 'stockout', 'listing'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab(tab as typeof activeTab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'add' && (
        <div>
          {/* Header + Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Inventory</h2>
              <p className="text-sm text-gray-500">Add stock / remove stock</p>
            </div>
            <div className="w-full md:w-64">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Inventory Adjust Form */}
          <InventoryAdjustForm
            draft={draft}
            items={items}
            onChangeItem={selectItem}
            onChangeDelta={setDelta}
            onChangeReason={setReason}
            onClear={resetDraft}
            onSubmit={handleSubmit}
          />

          {/* Inventory Table */}
          <InventoryTable items={filtered} onSelect={selectItem} activeId={draft.itemId} />
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">History</h2>
          <p className="text-sm text-gray-500">View adjustment history</p>

          {/* Filters */}
          <HistoryFilters
            dateOptions={["2025-09-01", "2025-09-02"]}
            reasonOptions={["Stock Added", "Stock Removed"]}
            onDateChange={(date) => console.log("Date selected:", date)}
            onReasonChange={(reason) => console.log("Reason selected:", reason)}
          />

          {/* History Table */}
          <HistoryTable
            data={[
              {
                adjustmentNo: "ADJ-001",
                date: "2025-09-01",
                reason: "Stock Added",
                itemName: "Alginate Powder",
                stockAfter: 15,
              },
              {
                adjustmentNo: "ADJ-002",
                date: "2025-09-02",
                reason: "Stock Removed",
                itemName: "Composite A2",
                stockAfter: 5,
              },
            ]}
          />

          {/* Export Section */}
          <div className="mt-4">
            <button className="text-sm font-medium text-teal-700 hover:text-teal-800">Export CSV</button>
          </div>
        </div>
      )}

      {activeTab === 'active' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Active</h2>
          <p className="text-sm text-gray-500">Browse active and inactive products.</p>

          {/* Filters */}
          <StatusFilters
            statusOptions={["Active", "Inactive"]}
            onStatusChange={(status) => console.log("Status selected:", status)}
          />

          {/* Add spacing between filters and table */}
          <div className="mt-6">
            <ActiveTable
              data={[
                {
                  sku: "SKU-001",
                  itemName: "Alginate Powder",
                  stockCount: 12,
                  status: "Active",
                },
                {
                  sku: "SKU-002",
                  itemName: "Composite A2",
                  stockCount: 0,
                  status: "Inactive",
                },
              ]}
            />
          </div>

          {/* Export Section */}
          <div className="mt-4">
            <button className="text-sm font-medium text-teal-700 hover:text-teal-800">Export CSV</button>
          </div>
        </div>
      )}

      {activeTab === 'stockout' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Stockout</h2>
          <p className="text-sm text-gray-500">View items that are out of stock.</p>

          {/* Filters */}
          <HistoryFilters
            dateOptions={["2025-09-01", "2025-09-02"]}
            reasonOptions={["Out of Stock"]}
            onDateChange={(date) => console.log("Date selected:", date)}
            onReasonChange={(reason) => console.log("Reason selected:", reason)}
          />

          {/* Stockout Table */}
          <StockoutTable
            data={[
              {
                sku: "SKU-001",
                itemName: "Alginate Powder",
                stockCount: 0,
                suggestedRestock: 10,
              },
              {
                sku: "SKU-002",
                itemName: "Composite A2",
                stockCount: 0,
                suggestedRestock: 15,
              },
            ]}
          />

          {/* Export Section */}
          <div className="mt-4">
            <button className="text-sm font-medium text-teal-700 hover:text-teal-800">Export CSV</button>
          </div>
        </div>
      )}

      {activeTab === 'listing' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Listing</h2>
          <p className="text-sm text-gray-500">Active / Low Stock / Stockout</p>

          {/* Filters */}
          <HistoryFilters
            dateOptions={["2025-09-01", "2025-09-02"]}
            reasonOptions={["Low Stock", "Stockout"]}
            onDateChange={(date) => console.log("Date selected:", date)}
            onReasonChange={(reason) => console.log("Reason selected:", reason)}
          />

          {/* Listing Table */}
          <ListingTable
            data={[
              {
                itemName: "Alginate Powder",
                stockCount: 12,
                suggestedThreshold: 5,
                status: "Active",
              },
              {
                itemName: "Composite A2",
                stockCount: 3,
                suggestedThreshold: 10,
                status: "Low Stock",
              },
            ]}
          />

          {/* Export Section */}
          <div className="mt-4">
            <button className="text-sm font-medium text-teal-700 hover:text-teal-800">Export CSV</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
