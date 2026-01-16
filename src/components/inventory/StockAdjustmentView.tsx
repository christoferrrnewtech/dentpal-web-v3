import React from 'react';
import { Package, ChevronDown, ChevronRight, Edit } from 'lucide-react';

interface StockAdjustmentViewProps {
  items: any[];
  categoriesList: Array<{ id: string; name: string }>;
  onAdjustStock: (productId: string) => void;
}

const StockAdjustmentView: React.FC<StockAdjustmentViewProps> = ({
  items,
  categoriesList,
  onAdjustStock,
}) => {
  const [filterName, setFilterName] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock' | 'stockAsc' | 'updatedAt'>('name');
  const [lowOnly, setLowOnly] = React.useState(false);

  const filteredProducts = React.useMemo(() => {
    return items
      .filter(item => {
        if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
        if (filterCategory && item.categoryID !== filterCategory) return false;
        if (lowOnly) {
          const threshold = item.suggestedThreshold || 5;
          return item.inStock <= threshold;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock') return (b.inStock || 0) - (a.inStock || 0);
        if (sortBy === 'stockAsc') return (a.inStock || 0) - (b.inStock || 0);
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [items, filterName, filterCategory, sortBy, lowOnly]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Stock Adjustment</h2>
        
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
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-52 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="name">Sort by: Name</option>
            <option value="stock">Sort by: Stock (High-Low)</option>
            <option value="stockAsc">Sort by: Stock (Low-High)</option>
            <option value="updatedAt">Sort by: Recently Updated</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input 
              type="checkbox" 
              className="accent-teal-600" 
              checked={lowOnly} 
              onChange={(e) => setLowOnly(e.target.checked)} 
            />
            Low stock only
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.categoryName || 'Uncategorized'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-semibold ${
                        product.inStock <= (product.suggestedThreshold || 5) 
                          ? 'text-red-600' 
                          : product.inStock <= (product.suggestedThreshold || 5) * 2 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`}>
                        {product.inStock}
                      </span>
                      {product.inStock <= (product.suggestedThreshold || 5) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onAdjustStock(product.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition shadow-sm hover:shadow-md"
                    >
                      <Edit className="w-4 h-4" />
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentView;
