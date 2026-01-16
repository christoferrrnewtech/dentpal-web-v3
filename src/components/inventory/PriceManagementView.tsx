import React from 'react';
import { CreditCard, Package } from 'lucide-react';

interface PriceManagementViewProps {
  items: any[];
  categoriesList: Array<{ id: string; name: string }>;
  onUpdatePrice: (productId: string) => void;
}

const PriceManagementView: React.FC<PriceManagementViewProps> = ({
  items,
  categoriesList,
  onUpdatePrice,
}) => {
  const [filterName, setFilterName] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'price' | 'priceAsc' | 'updatedAt'>('name');

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
        if (sortBy === 'priceAsc') return (a.price || 0) - (b.price || 0);
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [items, filterName, filterCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Management</h2>
        
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Filter by product name"
            className="w-64 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-48 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All categories</option>
            {categoriesList.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-48 max-w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name (A-Z)</option>
            <option value="price">Sort by Price (High-Low)</option>
            <option value="priceAsc">Sort by Price (Low-High)</option>
            <option value="updatedAt">Sort by Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm" 
                        />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.categoryName || 'Uncategorized'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">₱{(product.price || 0).toFixed(2)}</span>
                      {product.specialPrice && (
                        <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-orange-100 to-red-100 text-red-700 rounded-full border border-red-200">
                          Promo: ₱{product.specialPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onUpdatePrice(product.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-sm hover:shadow-md"
                    >
                      <CreditCard className="w-4 h-4" />
                      Update Price
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">No products found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceManagementView;
