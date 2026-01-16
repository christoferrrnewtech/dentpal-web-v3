import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Package, CreditCard, Edit, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ProductService } from '@/services/product';
import CategoryService from '@/services/category';
import InventoryCatalogView from './InventoryCatalogView';
import InventoryHistoryView from './InventoryHistoryView';
import StockAdjustmentView from './StockAdjustmentView';
import PriceManagementView from './PriceManagementView';

interface InventoryTabProps {
  sellerId?: string; 
  initialTab?: 'add' | 'history' | 'active' | 'stockout' | 'listing' | 'all' | 'price';
}

const InventoryTab: React.FC<InventoryTabProps> = ({ sellerId, initialTab = 'listing' }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  
  // Internal tab state
  const [inventoryControlTab, setInventoryControlTab] = useState<'all' | 'history' | 'stock-adjustment' | 'price-management'>(() => {
    if (initialTab === 'all' || initialTab === 'listing') return 'all';
    if (initialTab === 'history') return 'history';
    if (initialTab === 'add') return 'stock-adjustment';
    if (initialTab === 'price') return 'price-management';
    return 'all';
  });

  // History state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsDateRange, setLogsDateRange] = useState<{ start: Date | null; end: Date | null }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });
  const [logsPage, setLogsPage] = useState<number>(1);
  const logsPerPage = 50;

  // Modal states
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [stockDelta, setStockDelta] = useState<number>(0);
  const [variationStockDeltas, setVariationStockDeltas] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>('receive');
  const [notes, setNotes] = useState<string>('');
  const [countedStock, setCountedStock] = useState<number>(0);
  const [variationCountedStocks, setVariationCountedStocks] = useState<Record<string, number>>({});
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newSpecialPrice, setNewSpecialPrice] = useState<number | ''>(0);
  const [variationPrices, setVariationPrices] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const { uid, isSeller, isSubAccount, parentId } = useAuth();
  const { toast } = useToast();
  const effectiveSellerId = sellerId ?? (isSeller ? (isSubAccount ? (parentId || uid) : uid) : null);

  const categoriesList = useMemo(() => {
    return Object.entries(categoryMap)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryMap]);

  // Load categories
  useEffect(() => {
    const unsub = CategoryService.listenCategories((categories) => {
      const map: Record<string, string> = {};
      categories.forEach(cat => {
        map[cat.id] = cat.name;
      });
      setCategoryMap(map);
    });
    return () => unsub();
  }, []);

  // Load products
  useEffect(() => {
    if (!effectiveSellerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = ProductService.listenBySeller(effectiveSellerId, (rows) => {
      const mapped = rows.map(r => ({
        id: r.id,
        name: r.name,
        suggestedThreshold: r.suggestedThreshold != null ? Number(r.suggestedThreshold) : 5,
        inStock: r.inStock,
        updatedAt: r.updatedAt,
        description: r.description || '',
        imageUrl: r.imageUrl,
        category: r.category || r.categoryID,
        categoryID: r.categoryID,
        subcategory: r.subcategory || r.subCategoryID,
        subCategoryID: r.subCategoryID,
        price: r.price,
        specialPrice: r.specialPrice,
        status: r.status,
        isActive: r.status === 'active',
        variationCount: r.variationCount || 0,
      }));
      setItems(mapped);
      setLoading(false);
    });
    return () => unsub();
  }, [effectiveSellerId]);

  // Load logs for history
  useEffect(() => {
    if (!effectiveSellerId) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    const unsub = ProductService.listenProductLogsBySeller(
      effectiveSellerId, 
      (rows) => {
        setLogs(rows);
        setLogsLoading(false);
      },
      { 
        startDate: logsDateRange.start, 
        endDate: logsDateRange.end 
      }
    );
    return () => unsub();
  }, [effectiveSellerId, logsDateRange.start, logsDateRange.end]);

  const exportLogs = () => {
    // TODO: Implement export functionality
    console.log('Export logs');
  };

  const handleAdjustStock = async (productId: string) => {
    const product = enrichedItems.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setStockDelta(0);
      setVariationStockDeltas({});
      setReason('receive');
      setNotes('');
      setCountedStock(product.inStock || 0);
      setVariationCountedStocks({});
      
      // Load variations
      const unsub = ProductService.listenVariations(productId, (vars) => {
        setVariations(vars);
        const initialDeltas: Record<string, number> = {};
        const initialCounted: Record<string, number> = {};
        vars.forEach(v => { 
          initialDeltas[v.id] = 0;
          initialCounted[v.id] = v.stock || 0;
        });
        setVariationStockDeltas(initialDeltas);
        setVariationCountedStocks(initialCounted);
      });
      
      setShowStockModal(true);
    }
  };

  const handleUpdatePrice = async (productId: string) => {
    const product = enrichedItems.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setNewPrice(product.price || 0);
      setNewSpecialPrice(product.specialPrice || '');
      setVariationPrices({});
      
      // Load variations
      const unsub = ProductService.listenVariations(productId, (vars) => {
        setVariations(vars);
        const initialPrices: Record<string, number> = {};
        vars.forEach(v => { initialPrices[v.id] = v.price || 0; });
        setVariationPrices(initialPrices);
      });
      
      setShowPriceModal(true);
    }
  };

  const handleSaveStockAdjustment = async () => {
    if (!selectedProduct) return;
    
    let actualStockDelta = stockDelta;
    
    // For inventory count, calculate delta from counted stock
    if (reason === 'count') {
      actualStockDelta = countedStock - selectedProduct.inStock;
    }
    
    // Check if there are any changes
    const hasProductChange = actualStockDelta !== 0;
    const hasVariationChanges = Object.values(variationStockDeltas).some(delta => delta !== 0) || 
      (reason === 'count' && Object.entries(variationCountedStocks).some(([id, counted]) => {
        const variation = variations.find(v => v.id === id);
        return variation && counted !== variation.stock;
      }));
    
    if (!hasProductChange && !hasVariationChanges) {
      toast({ title: 'Info', description: 'No stock changes to save', variant: 'default' });
      return;
    }
    
    setSubmitting(true);
    try {
      const reasonLabels = {
        receive: 'Received Items',
        count: 'Inventory Count',
        loss: 'Loss',
        damaged: 'Damaged'
      };
      
      // Update main product stock if changed
      if (hasProductChange) {
        const newStock = selectedProduct.inStock + actualStockDelta;
        await ProductService.adjustProductStock(selectedProduct.id, actualStockDelta);
        
        await ProductService.addProductLog(selectedProduct.id, {
          action: 'adjust_stock',
          userId: uid || '',
          detail: `${reasonLabels[reason as keyof typeof reasonLabels]} - Main product stock adjusted by ${actualStockDelta > 0 ? '+' : ''}${actualStockDelta}${notes ? `. Notes: ${notes}` : ''}`,
          before: selectedProduct.inStock,
          after: newStock,
          sellerId: effectiveSellerId || '',
          productName: selectedProduct.name,
        });
      }
      
      // Update variation stocks if changed
      for (const variation of variations) {
        let varDelta = variationStockDeltas[variation.id] || 0;
        
        // For inventory count, calculate delta from counted stock
        if (reason === 'count') {
          varDelta = (variationCountedStocks[variation.id] || 0) - (variation.stock || 0);
        }
        
        if (varDelta !== 0) {
          await ProductService.adjustVariationStock(selectedProduct.id, variation.id, varDelta);
          
          await ProductService.addProductLog(selectedProduct.id, {
            action: 'adjust_stock',
            userId: uid || '',
            detail: `${reasonLabels[reason as keyof typeof reasonLabels]} - Variation "${variation.name}" stock adjusted by ${varDelta > 0 ? '+' : ''}${varDelta}${notes ? `. Notes: ${notes}` : ''}`,
            before: variation.stock,
            after: variation.stock + varDelta,
            sellerId: effectiveSellerId || '',
            productName: `${selectedProduct.name} - ${variation.name}`,
          });
        }
      }
      
      toast({ title: 'Success', description: 'Stock updated successfully' });
      setShowStockModal(false);
      setSelectedProduct(null);
      setVariations([]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update stock', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePriceUpdate = async () => {
    if (!selectedProduct) return;
    
    setSubmitting(true);
    try {
      // Update main product price
      if (newPrice > 0) {
        await ProductService.updatePriceAndPromo(
          selectedProduct.id, 
          { 
            price: newPrice, 
            specialPrice: newSpecialPrice || null,
            promoStart: null,
            promoEnd: null
          },
          uid || '',
          ''
        );
      }
      
      // Update variation prices
      for (const [varId, price] of Object.entries(variationPrices)) {
        if (price > 0) {
          const variation = variations.find(v => v.id === varId);
          if (variation && price !== variation.price) {
            await ProductService.updateVariation(selectedProduct.id, varId, { price });
          }
        }
      }
      
      toast({ title: 'Success', description: 'Price updated successfully' });
      setShowPriceModal(false);
      setSelectedProduct(null);
      setVariations([]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update price', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (productId: string) => {
    // TODO: Open edit item modal
    console.log('Edit item:', productId);
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    await ProductService.toggleActive(productId, isActive);
  };

  // Enrich items with category names
  const enrichedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      categoryName: categoryMap[item.categoryID] || categoryMap[item.category] || 'N/A',
    }));
  }, [items, categoryMap]);

  return (
    <div className="space-y-6">
      {/* Inventory Control Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-1">
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: 'All', icon: Package },
            { key: 'history', label: 'History', icon: CalendarClock },
            { key: 'stock-adjustment', label: 'Stock Adjustment', icon: Edit },
            { key: 'price-management', label: 'Price Management', icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = inventoryControlTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setInventoryControlTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render appropriate view based on selected tab */}
      {inventoryControlTab === 'all' && (
        <InventoryCatalogView
          items={enrichedItems}
          categoryMap={categoryMap}
        />
      )}
      
      {inventoryControlTab === 'history' && (
        <InventoryHistoryView
          logs={logs}
          logsLoading={logsLoading}
          logsDateRange={logsDateRange}
          setLogsDateRange={setLogsDateRange}
          logsPage={logsPage}
          setLogsPage={setLogsPage}
          logsPerPage={logsPerPage}
          exportLogs={exportLogs}
        />
      )}
      
      {inventoryControlTab === 'stock-adjustment' && (
        <StockAdjustmentView
          items={enrichedItems}
          categoriesList={categoriesList}
          onAdjustStock={handleAdjustStock}
        />
      )}
      
      {inventoryControlTab === 'price-management' && (
        <PriceManagementView
          items={enrichedItems}
          categoriesList={categoriesList}
          onUpdatePrice={handleUpdatePrice}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && setShowStockModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Adjust Stock</h3>
              <button onClick={() => !submitting && setShowStockModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selected Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="receive">Receive Items</option>
                  <option value="count">Inventory Count</option>
                  <option value="loss">Loss</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={2}
                  placeholder="Enter notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{selectedProduct.categoryName}</div>
                </div>
              </div>
              
              {/* Main Product Stock */}
              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Main Product Stock</h4>
                
                {reason === 'count' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expected Stock</label>
                      <div className="p-2 bg-white rounded border text-sm font-semibold text-gray-900">
                        {selectedProduct.inStock}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Counted Stock</label>
                      <input
                        type="number"
                        value={countedStock}
                        onChange={(e) => setCountedStock(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">In Stock</label>
                      <div className="p-2 bg-white rounded border text-sm font-semibold text-gray-900">
                        {selectedProduct.inStock}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {reason === 'receive' ? 'Add Stock' : 'Remove Stock'}
                      </label>
                      <input
                        type="number"
                        value={reason === 'receive' ? stockDelta : -stockDelta}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setStockDelta(reason === 'receive' ? val : -val);
                        }}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Stock After</label>
                      <div className="p-2 bg-teal-100 rounded border-2 border-teal-300 text-sm font-bold text-teal-700">
                        {selectedProduct.inStock + stockDelta}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Variations Stock */}
              {variations.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Variations ({variations.length})</h4>
                  <div className="space-y-3">
                    {variations.map((variation) => (
                      <div key={variation.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-2">{variation.name}</div>
                        
                        {reason === 'count' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Expected Stock</label>
                              <div className="text-sm font-semibold text-gray-900">{variation.stock || 0}</div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Counted Stock</label>
                              <input
                                type="number"
                                value={variationCountedStocks[variation.id] || 0}
                                onChange={(e) => setVariationCountedStocks({
                                  ...variationCountedStocks,
                                  [variation.id]: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">In Stock</label>
                              <div className="text-sm font-semibold text-gray-900">{variation.stock || 0}</div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                {reason === 'receive' ? 'Add Stock' : 'Remove Stock'}
                              </label>
                              <input
                                type="number"
                                value={reason === 'receive' 
                                  ? (variationStockDeltas[variation.id] || 0) 
                                  : -(variationStockDeltas[variation.id] || 0)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setVariationStockDeltas({
                                    ...variationStockDeltas,
                                    [variation.id]: reason === 'receive' ? val : -val
                                  });
                                }}
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Stock After</label>
                              <div className="text-sm font-bold text-blue-700">
                                {(variation.stock || 0) + (variationStockDeltas[variation.id] || 0)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => !submitting && setShowStockModal(false)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStockAdjustment}
                disabled={submitting || stockDelta === 0}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Update Modal */}
      {showPriceModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && setShowPriceModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Update Price</h3>
              <button onClick={() => !submitting && setShowPriceModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{selectedProduct.categoryName}</div>
                </div>
              </div>
              
              {/* Main Product Price */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Main Product Price</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Current Price</label>
                    <div className="p-2 bg-white rounded border text-sm font-semibold text-gray-900">
                      ₱{(selectedProduct.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Price (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Special Price (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSpecialPrice}
                      onChange={(e) => setNewSpecialPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Variations Price */}
              {variations.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Variations ({variations.length})</h4>
                  <div className="space-y-3">
                    {variations.map((variation) => (
                      <div key={variation.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-sm font-medium text-gray-900 mb-2">{variation.name}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Current Price</label>
                            <div className="text-sm font-semibold text-gray-900">
                              ₱{(variation.price || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">New Price</label>
                            <input
                              type="number"
                              step="0.01"
                              value={variationPrices[variation.id] || variation.price || 0}
                              onChange={(e) => setVariationPrices({
                                ...variationPrices,
                                [variation.id]: parseFloat(e.target.value) || 0
                              })}
                              className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-500"
                              placeholder="New price"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => !submitting && setShowPriceModal(false)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePriceUpdate}
                disabled={submitting || newPrice <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
