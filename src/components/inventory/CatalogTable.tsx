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
  // New: optional context for current tab to switch columns
  tabKey?: 'all' | 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
}

const CatalogTable: React.FC<Props> = ({ items, onToggleActive, onEdit, onEditPrice, onEditStock, onDelete, onRestore, tabKey }) => {
  const isViolationView = tabKey === 'violation';

  // Simple client-side pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  React.useEffect(() => { setPage(1); }, [items, tabKey]);
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-[11px] font-semibold text-gray-600 tracking-wide">
            <th className="px-4 py-2">PRODUCT</th>
            {isViolationView ? (
              <>
                <th className="px-4 py-2">REASON</th>
                <th className="px-4 py-2">ACTIONS</th>
              </>
            ) : (
              <>
                <th className="px-4 py-2 hidden sm:table-cell">PRICE</th>
                <th className="px-4 py-2">STOCK</th>
                <th className="px-4 py-2 hidden md:table-cell">ACTIVE</th>
                <th className="px-4 py-2">ACTIONS</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {paged.map((i) => {
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

                {isViolationView ? (
                  <>
                    <td className="px-4 py-2 text-gray-700 align-top">
                      <div className="max-w-[520px] whitespace-pre-wrap break-words text-xs">{i.qcReason || '—'}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                          onClick={() => onEdit(i.id)}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                        onClick={() => !isDeleted && onEditPrice && onEditPrice(i)}
                        title={isDeleted ? 'Unavailable for archived items' : 'Edit price'}
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
                        title={isDeleted ? 'Unavailable for archived items' : 'Adjust stock'}
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
                          onRestore ? (
                            <button
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-white border border-gray-300 hover:bg-gray-50"
                              onClick={() => onRestore(i)}
                              title="Restore from archive"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                          ) : null
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
                  </>
                )}
              </tr>
            );
          })}
          {paged.length === 0 && (
            <tr>
              <td colSpan={isViolationView ? 3 : 5} className="px-4 py-8 text-center text-xs text-gray-500">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-white text-xs text-gray-600">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
          <button className="px-2 py-1 border rounded disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default CatalogTable;
