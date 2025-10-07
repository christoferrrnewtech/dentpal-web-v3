import React from 'react';
import { InventoryItem } from './types';
import { Pencil, Edit3, Trash2, RotateCcw } from 'lucide-react';

interface Props {
  items: InventoryItem[];
  onToggleActive: (id: string, nextActive: boolean) => void;
  onEdit: (id: string) => void;
  onEditPrice?: (item: InventoryItem) => void; // New: inline price editor trigger
  onEditStock?: (item: InventoryItem) => void; // New: inline stock adjust trigger
  onDelete?: (item: InventoryItem) => void; // New: delete trigger
  onRestore?: (item: InventoryItem) => void; // New: restore trigger for deleted items
}

const CatalogTable: React.FC<Props> = ({ items, onToggleActive, onEdit, onEditPrice, onEditStock, onDelete, onRestore }) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
            <th className="px-4 py-2">PRODUCT</th>
            <th className="px-4 py-2 hidden sm:table-cell">PRICE</th>
            <th className="px-4 py-2">STOCK</th>
            <th className="px-4 py-2 hidden md:table-cell">ACTIVE</th>
            <th className="px-4 py-2">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const showSale = i.specialPrice != null && Number(i.specialPrice) > 0 && Number(i.specialPrice) < Number(i.price ?? Infinity);
            const status = (i.status ?? 'active');
            const isActive = status === 'active';
            const isDeleted = status === 'deleted';
            return (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt={i.name} className="h-10 w-10 rounded object-cover bg-gray-100" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">{i.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {i.category || 'Uncategorized'}{i.subcategory ? ` • ${i.subcategory}` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                    onClick={() => !isDeleted && onEditPrice && onEditPrice(i)}
                    title={isDeleted ? 'Unavailable for deleted items' : 'Edit price'}
                  >
                    {i.price != null ? (
                      showSale ? (
                        <>
                          <span className="font-semibold text-teal-700">₱{Number(i.specialPrice).toLocaleString()}</span>
                          <span className="line-through text-gray-400">₱{Number(i.price).toLocaleString()}</span>
                        </>
                      ) : (
                        <span>₱{Number(i.price).toLocaleString()}</span>
                      )
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    <Pencil className={`w-3.5 h-3.5 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-gray-700">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                    onClick={() => !isDeleted && onEditStock && onEditStock(i)}
                    title={isDeleted ? 'Unavailable for deleted items' : 'Adjust stock'}
                  >
                    {i.inStock}
                    <Pencil className={`w-3.5 h-3.5 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 hidden md:table-cell">
                  <label className={`inline-flex items-center select-none ${isDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isActive}
                      onChange={(e) => !isDeleted && onToggleActive(i.id, e.target.checked)}
                      disabled={isDeleted}
                    />
                    <div
                      className={`relative w-11 h-6 rounded-full ${isDeleted ? 'bg-gray-200' : 'bg-gray-300'} transition-colors duration-200 ease-in-out ${!isDeleted ? 'peer-checked:bg-teal-600' : ''}
                                 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow
                                 after:transform after:transition-transform after:duration-200 after:ease-in-out ${!isDeleted ? 'peer-checked:after:translate-x-5' : ''}`}
                    />
                  </label>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {isDeleted ? (
                      onRestore && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-teal-700 hover:bg-teal-50 hover:border-teal-200 shadow-sm"
                          onClick={() => onRestore(i)}
                          title="Restore product"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                          onClick={() => onEdit(i.id)}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        {onDelete && (
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm"
                            onClick={() => onDelete(i)}
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CatalogTable;
