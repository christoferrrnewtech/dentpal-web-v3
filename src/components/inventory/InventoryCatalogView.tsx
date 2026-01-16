import React, { useMemo } from 'react';
import { AlertTriangle, CircleSlash, Package } from 'lucide-react';
import CatalogTable from './CatalogTable';
import { ProductService } from '@/services/product';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_OPTIONS } from './constants';

interface InventoryCatalogViewProps {
  items: any[];
  categoryMap: Record<string, string>;
}

const InventoryCatalogView: React.FC<InventoryCatalogViewProps> = ({
  items,
  categoryMap,
}) => {
  const { toast } = useToast();
  const [catalogTab, setCatalogTab] = React.useState<'all' | 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted'>('all');
  const [filterName, setFilterName] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock' | 'stockAsc' | 'updatedAt'>('name');
  const [lowOnly, setLowOnly] = React.useState(false);

  // Enrich items with category names
  const enrichedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      isActive: item.isActive != null ? !!item.isActive : ((item.status as any) === 'active'),
      categoryName: categoryMap[item.category as string] || item.category || 'N/A',
    }));
  }, [items, categoryMap]);

  const filteredCatalog = useMemo(() => {
    const nameQuery = (filterName || '').trim().toLowerCase();
    return enrichedItems
      .filter(i => {
        const status = (i.status ?? 'active');
        if (catalogTab === 'all') return true;
        if (catalogTab === 'pending_qc') return status === 'pending_qc';
        return status === catalogTab;
      })
      .filter(i => {
        if (!nameQuery) return true;
        const n = (i.name || '').toLowerCase();
        const s = (i.sku || '').toLowerCase();
        return n.includes(nameQuery) || s.includes(nameQuery);
      })
      .filter(i => {
        if (!filterCategory) return true;
        return i.categoryName === filterCategory;
      })
      .filter(i => {
        if (!lowOnly) return true;
        const thr = Number(i.suggestedThreshold ?? 5);
        const stock = Number(i.inStock || 0);
        return stock === 0 || (thr > 0 && stock > 0 && stock <= thr);
      })
      .sort((a, b) => {
        if (sortBy === 'stock') {
          const diff = (Number(b.inStock || 0) - Number(a.inStock || 0));
          if (diff !== 0) return diff;
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'stockAsc') {
          const diff = (Number(a.inStock || 0) - Number(b.inStock || 0));
          if (diff !== 0) return diff;
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'updatedAt') {
          return (Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [enrichedItems, catalogTab, filterName, filterCategory, lowOnly, sortBy]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, draft: 0, pending_qc: 0, violation: 0, deleted: 0, all: enrichedItems.length };
    enrichedItems.forEach(item => {
      const status = item.status ?? 'active';
      if (status in counts) counts[status as keyof typeof counts]++;
    });
    return counts;
  }, [enrichedItems]);

  const stockSummary = useMemo(() => {
    let out = 0, low = 0;
    enrichedItems.forEach(item => {
      const stock = Number(item.inStock || 0);
      const threshold = Number(item.suggestedThreshold || 5);
      if (stock === 0) out++;
      else if (stock <= threshold) low++;
    });
    return { out, low };
  }, [enrichedItems]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
          { key: 'draft', label: 'Draft' },
          { key: 'pending_qc', label: 'Pending QC' },
          { key: 'violation', label: 'Violation' },
          { key: 'deleted', label: 'Archive' },
        ].map(t => (
          <button
            key={t.key}
            className={`relative px-3 py-1.5 text-sm font-medium rounded ${catalogTab === t.key ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            onClick={() => setCatalogTab(t.key as any)}
          >
            {t.label}
            {t.key === 'active' && statusCounts.active > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-teal-600 text-white text-[10px] leading-none shadow ring-2 ring-white">
                {statusCounts.active}
              </span>
            )}
            {t.key === 'inactive' && statusCounts.inactive > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-gray-500 text-white text-[10px] leading-none shadow ring-2 ring-white">
                {statusCounts.inactive}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Filter by product name"
          className="w-64 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-48 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-48 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="name">Sort by: Name</option>
          <option value="stock">Sort by: Stock (desc)</option>
          <option value="stockAsc">Sort by: Stock (asc)</option>
          <option value="updatedAt">Sort by: Updated</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-teal-600" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-700"><CircleSlash className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-red-700">Out of stock</div>
            <div className="text-xl font-semibold text-red-800">{stockSummary.out}</div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-amber-700">Low stock</div>
            <div className="text-xl font-semibold text-amber-800">{stockSummary.low}</div>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <CatalogTable
        items={filteredCatalog}
        tabKey={catalogTab}
        onToggleActive={async (id, next) => {
          await ProductService.toggleActive(id, next);
        }}
        onRestore={async (item) => {
          try {
            await ProductService.restore(item.id);
            setCatalogTab('inactive');
            toast({ title: 'Product restored', description: 'Moved to Inactive tab. Toggle to activate when ready.' });
          } catch (e) {
            console.error('Restore failed', e);
            toast({ title: 'Failed to restore', description: 'Please try again.' });
          }
        }}
      />
    </div>
  );
};

export default InventoryCatalogView;
