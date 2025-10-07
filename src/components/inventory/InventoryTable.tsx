import React from 'react';
import { InventoryItem } from './types';

interface Props { items: InventoryItem[]; onSelect: (id: string) => void; activeId?: string | null; }

const InventoryTable: React.FC<Props> = ({ items, onSelect, activeId }) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
            <th className="px-4 py-2">ITEM</th>
            <th className="px-4 py-2 hidden sm:table-cell">SUGGESTED</th>
            <th className="px-4 py-2">IN STOCK</th>
            <th className="px-4 py-2 hidden md:table-cell">UPDATED</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => {
            const isActive = i.id === activeId;
            const showSale = i.specialPrice != null && Number(i.specialPrice) > 0 && Number(i.specialPrice) < Number(i.price ?? Infinity);
            return (
              <tr
                key={i.id}
                onClick={() => onSelect(i.id)}
                className={`cursor-pointer border-b last:border-0 transition ${isActive ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt={i.name} className="h-9 w-9 rounded object-cover bg-gray-100 flex-shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded bg-gray-100 flex-shrink-0" />
                    )}

                    {/* Name + meta */}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">{i.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        {/* Price / Special */}
                        {i.price != null && (
                          <div className="flex items-center gap-1">
                            {showSale ? (
                              <>
                                <span className="font-semibold text-teal-700">₱{Number(i.specialPrice).toLocaleString()}</span>
                                <span className="line-through text-gray-400">₱{Number(i.price).toLocaleString()}</span>
                              </>
                            ) : (
                              <span>₱{Number(i.price).toLocaleString()}</span>
                            )}
                          </div>
                        )}
                        {/* Variants badge */}
                        {i.hasVariants && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{(i.variants?.length ?? 0)} variants</span>
                        )}
                        {/* Category/subcategory */}
                        {i.category && (
                          <span className="truncate max-w-[10rem]">{i.category}{i.subcategory ? ` • ${i.subcategory}` : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">{i.suggestedThreshold}</td>
                <td className="px-4 py-2 text-gray-700">{i.inStock}</td>
                <td className="px-4 py-2 text-gray-500 text-xs hidden md:table-cell">{new Date(i.updatedAt).toLocaleDateString()}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-500">No items found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
export default InventoryTable;
