import React from 'react';
import { InventoryItem } from './types';
import { Pencil, Edit3, Trash2, RotateCcw, Filter } from 'lucide-react';

interface Props {
  items: InventoryItem[];
  onToggleActive: (id: string, nextActive: boolean) => void;
  onEdit?: (id: string) => void;
  onEditPrice?: (item: InventoryItem) => void; 
  onEditStock?: (item: InventoryItem) => void; 
  onDelete?: (item: InventoryItem) => void; 
  onRestore?: (item: InventoryItem) => void; 
  tabKey?: 'all' | 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
}

const CatalogTable: React.FC<Props> = ({ items, onToggleActive, onEdit, onEditPrice, onEditStock, onDelete, onRestore, tabKey }) => {
  const isViolationView = tabKey === 'violation';
  const isPendingView = tabKey === 'pending_qc';
  const showActionsColumn = Boolean(onEdit || onDelete || onRestore);

  const [filters, setFilters] = React.useState({
    product: '',
    priceMin: '',
    priceMax: '',
    stockMin: '',
    stockMax: '',
    active: 'all' as 'all' | 'active' | 'inactive' | 'deleted' | 'pending_qc' | 'violation' | 'draft',
  });
  const [openFilter, setOpenFilter] = React.useState<{[k: string]: boolean}>({});

  const toggleFilter = (key: string) => setOpenFilter((p) => ({ ...p, [key]: !p[key] }));
  const closeAllFilters = () => setOpenFilter({});

  const filteredItems = React.useMemo(() => {
    const nameQ = filters.product.trim().toLowerCase();
    const priceMin = filters.priceMin ? Number(filters.priceMin) : null;
    const priceMax = filters.priceMax ? Number(filters.priceMax) : null;
    const stockMin = filters.stockMin ? Number(filters.stockMin) : null;
    const stockMax = filters.stockMax ? Number(filters.stockMax) : null;

    return items.filter((i) => {

      if (nameQ && !String(i.name || '').toLowerCase().includes(nameQ)) return false;
      const price = i.specialPrice != null && Number(i.specialPrice) > 0 ? Number(i.specialPrice) : (i.price != null ? Number(i.price) : null);
      if ((priceMin != null) && price != null && !(price >= priceMin)) return false;
      if ((priceMax != null) && price != null && !(price <= priceMax)) return false;

      const stock = i.inStock != null ? Number(i.inStock) : null;
      if ((stockMin != null) && stock != null && !(stock >= stockMin)) return false;
      if ((stockMax != null) && stock != null && !(stock <= stockMax)) return false;

      const s = (i.status as any) || 'active';
      if (filters.active !== 'all') {
        if (filters.active === 'active' && s !== 'active') return false;
        if (filters.active === 'inactive' && s !== 'inactive') return false;
        if (filters.active === 'deleted' && s !== 'deleted') return false;
        if (filters.active === 'pending_qc' && s !== 'pending_qc') return false;
        if (filters.active === 'violation' && s !== 'violation') return false;
        if (filters.active === 'draft' && s !== 'draft') return false;
      }
      return true;
    });
  }, [items, filters]);

  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  React.useEffect(() => { setPage(1); }, [filteredItems, tabKey]);
  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  const HeaderWithFilter: React.FC<{ label: string; fkey: string; children: React.ReactNode; className?: string }> = ({ label, fkey, children, className }) => (
    <th className={`px-4 py-2 relative ${className || ''}`}>
      <div className="flex items-center gap-2 text-left text-[11px] font-semibold text-gray-600 tracking-wide">
        <span>{label}</span>
        <button type="button" onClick={() => toggleFilter(fkey)} className="p-1 -m-1 rounded hover:bg-gray-200/60" title={`Filter by ${label.toLowerCase()}`}>
          <Filter className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {openFilter[fkey] && (
        <div className="absolute z-20 mt-2 right-2 top-full bg-white border border-gray-200 rounded-lg shadow p-3 w-64" onClick={(e)=> e.stopPropagation()}>
          {children}
          <div className="mt-3 flex justify-end gap-2">
            <button className="px-2 py-1 text-xs border rounded" onClick={() => { setFilters((f) => ({ ...f, ...(fkey === 'product' ? { product: '' } : fkey === 'price' ? { priceMin: '', priceMax: '' } : fkey === 'stock' ? { stockMin: '', stockMax: '' } : fkey === 'active' ? { active: 'all' } : {}) })); closeAllFilters(); }}>Clear</button>
            <button className="px-2 py-1 text-xs rounded bg-teal-600 text-white" onClick={() => closeAllFilters()}>Apply</button>
          </div>
        </div>
      )}
    </th>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left">
            <HeaderWithFilter fkey="product" label="PRODUCT">
              <div className="space-y-2">
                <label className="block text-[11px] text-gray-600">Name</label>
                <input
                  className="w-full p-2 border border-gray-200 rounded text-xs"
                  placeholder="Search name..."
                  value={filters.product}
                  onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))}
                />
              </div>
            </HeaderWithFilter>
            {isViolationView ? (
              <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-600 tracking-wide">REASON</th>
            ) : isPendingView ? (
              <>
                <th className="px-4 py-2 hidden sm:table-cell text-left text-[11px] font-semibold text-gray-600 tracking-wide">TIMESTAMP</th>
                <HeaderWithFilter fkey="price" label="PRICE" className="hidden sm:table-cell">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600">Min</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.priceMin} onChange={(e)=> setFilters((f)=> ({...f, priceMin: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600">Max</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.priceMax} onChange={(e)=> setFilters((f)=> ({...f, priceMax: e.target.value}))} />
                    </div>
                  </div>
                </HeaderWithFilter>
                <HeaderWithFilter fkey="stock" label="STOCK">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600">Min</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.stockMin} onChange={(e)=> setFilters((f)=> ({...f, stockMin: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600">Max</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.stockMax} onChange={(e)=> setFilters((f)=> ({...f, stockMax: e.target.value}))} />
                    </div>
                  </div>
                </HeaderWithFilter>
                {showActionsColumn && (
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-600 tracking-wide">ACTIONS</th>
                )}
              </>
            ) : (
              <>
                <HeaderWithFilter fkey="price" label="PRICE" className="hidden sm:table-cell">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600">Min</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.priceMin} onChange={(e)=> setFilters((f)=> ({...f, priceMin: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600">Max</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.priceMax} onChange={(e)=> setFilters((f)=> ({...f, priceMax: e.target.value}))} />
                    </div>
                  </div>
                </HeaderWithFilter>
                <HeaderWithFilter fkey="stock" label="STOCK">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600">Min</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.stockMin} onChange={(e)=> setFilters((f)=> ({...f, stockMin: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600">Max</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded text-xs" value={filters.stockMax} onChange={(e)=> setFilters((f)=> ({...f, stockMax: e.target.value}))} />
                    </div>
                  </div>
                </HeaderWithFilter>
                <HeaderWithFilter fkey="active" label="ACTIVE" className="hidden md:table-cell">
                  <div className="space-y-2">
                    <label className="block text-[11px] text-gray-600">Status</label>
                    <select
                      className="w-full p-2 border border-gray-200 rounded text-xs"
                      value={filters.active}
                      onChange={(e)=> setFilters((f)=> ({...f, active: e.target.value as any}))}
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="draft">Draft</option>
                      <option value="pending_qc">Pending QC</option>
                      <option value="violation">Violation</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
                </HeaderWithFilter>
                {showActionsColumn && (
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-600 tracking-wide">ACTIONS</th>
                )}
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
                    {showActionsColumn && (
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {onEdit && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                              onClick={() => onEdit(i.id)}
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </>
                ) : isPendingView ? (
                  <>
                    <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
                      <div className="text-xs text-gray-600">{i.updatedAt ? new Date(Number(i.updatedAt)).toLocaleString() : '—'}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
                      {onEditPrice ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                          onClick={() => !isDeleted && onEditPrice(i)}
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
                      ) : (
                        <div>
                          {i.price != null ? (
                            showSale ? (
                              <>
                                <span className="font-semibold text-teal-700">₱{Number(i.specialPrice).toLocaleString()}</span>
                                <span className="line-through text-gray-400 ml-1">₱{Number(i.price).toLocaleString()}</span>
                              </>
                            ) : (
                              <span>₱{Number(i.price).toLocaleString()}</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {onEditStock ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                          onClick={() => !isDeleted && onEditStock(i)}
                          title={isDeleted ? 'Unavailable for archived items' : 'Adjust stock'}
                        >
                          {i.inStock}
                          <Pencil className={`w-3.5 h-3.5 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`} />
                        </button>
                      ) : (
                        <span>{i.inStock}</span>
                      )}
                    </td>
                    {showActionsColumn && (
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {onEdit && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                              onClick={() => onEdit(i.id)}
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                          {onDelete && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm"
                              onClick={() => onDelete(i)}
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-gray-700 hidden sm:table-cell">
                      {onEditPrice ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                          onClick={() => !isDeleted && onEditPrice(i)}
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
                      ) : (
                        <div>
                          {i.price != null ? (
                            showSale ? (
                              <>
                                <span className="font-semibold text-teal-700">₱{Number(i.specialPrice).toLocaleString()}</span>
                                <span className="line-through text-gray-400 ml-1">₱{Number(i.price).toLocaleString()}</span>
                              </>
                            ) : (
                              <span>₱{Number(i.price).toLocaleString()}</span>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {onEditStock ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-2 ${isDeleted ? 'text-gray-400 cursor-not-allowed' : 'hover:underline'}`}
                          onClick={() => !isDeleted && onEditStock(i)}
                          title={isDeleted ? 'Unavailable for archived items' : 'Adjust stock'}
                        >
                          {i.inStock}
                          <Pencil className={`w-3.5 h-3.5 ${isDeleted ? 'text-gray-300' : 'text-gray-500'}`} />
                        </button>
                      ) : (
                        <span>{i.inStock}</span>
                      )}
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
                    {showActionsColumn && (
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
                              {onEdit && (
                                <button
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                                  onClick={() => onEdit(i.id)}
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                              )}
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
                    )}
                  </>
                )}
              </tr>
            );
          })}
          {paged.length === 0 && (
            <tr>
              <td colSpan={isViolationView ? (1 + 1 + (showActionsColumn ? 1 : 0)) : isPendingView ? (1 + 1 + 1 + 1 + (showActionsColumn ? 1 : 0)) : (1 + 1 + 1 + 1 + (showActionsColumn ? 1 : 0))} className="px-4 py-8 text-center text-xs text-gray-500">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>

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
