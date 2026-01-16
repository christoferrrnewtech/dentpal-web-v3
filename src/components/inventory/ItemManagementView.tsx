import React from 'react';
import { Package } from 'lucide-react';

interface ItemManagementViewProps {
  items: any[];
  categoriesList: Array<{ id: string; name: string }>;
  onEditItem: (productId: string) => void;
  onToggleActive: (productId: string, isActive: boolean) => void;
}

const ItemManagementView: React.FC<ItemManagementViewProps> = ({
  items,
  categoriesList,
  onEditItem,
  onToggleActive,
}) => {
  const [filterName, setFilterName] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'price' | 'stock' | 'updatedAt'>('name');

  const filteredProducts = React.useMemo(() => {
    return items
      .filter(item => {
        if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
        if (filterCategory && item.categoryID !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'stock') return (b.inStock || 0) - (a.inStock || 0);
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [items, filterName, filterCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Item Management</h2>
        
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
            className="w-48 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="price">Sort by Price (High-Low)</option>
            <option value="stock">Sort by Stock (High-Low)</option>
            <option value="updatedAt">Sort by Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{product.categoryName || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">₱{(product.price || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{product.inStock || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Active Toggle */}
                      <label className="inline-flex items-center select-none cursor-pointer" role="switch" aria-checked={!!product.isActive}>
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!product.isActive}
                          onChange={(e) => onToggleActive(product.id, e.target.checked)}
                        />
                        <div
                          className="relative w-11 h-6 rounded-full bg-gray-300 transition-colors duration-200 ease-in-out peer-checked:bg-teal-600
                                     after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow
                                     after:transform after:transition-transform after:duration-200 after:ease-in-out peer-checked:after:translate-x-5"
                        />
                      </label>
                      {/* Edit Button */}
                      <button
                        onClick={() => onEditItem(product.id)}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemManagementView;
