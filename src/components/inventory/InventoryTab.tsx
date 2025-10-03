import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { InventoryService } from '../../services/inventory';
import { useAuth } from '@/hooks/use-auth';
import { getWebUsers } from '@/services/webUserService';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProductService } from '@/services/product';

// Category and subcategory options
const CATEGORY_OPTIONS = ['Consumables', 'Dental Equipment', 'Disposables', 'Equipment'] as const;
const SUBCATEGORY_OPTIONS: Record<typeof CATEGORY_OPTIONS[number], string[]> = {
  Consumables: [
    'Bonding Agents',
    'Cements',
    'Cleaning Solutions',
    'Endodontic materials',
    'Fillings',
    'Impression materials',
    'Orthodontic Materials',
    'Polishing Agents',
    'Restorative materials',
    'Sealants',
    'Temporary materials',
  ],
  'Dental Equipment': ['Tools'],
  Disposables: ['Clinical Waste', 'Instrument and Tools', 'Patient Care Items', 'Protective Wear'],
  Equipment: [
    'Curing light',
    'Dental Chairs and Units',
    'Diagnostic Equipment',
    'Handpieces and Tools',
    'Impression Equipment',
    'Orthodontic Equipments',
    'Prosthodentics Equipments',
    'Sterilization Equipment',
    'Ultrasonic Cleaners',
  ],
};

// Map UI category names to Firestore Category document IDs
const CATEGORY_NAME_TO_ID: Record<string, string> = {
  'Disposables': 'EsDNnmc72LZNMHk3SmeV',
  'Dental Equipment': 'PtqCTLGduo6vay2umpMY',
  'Consumables': 'iXMJ7vcFIcMjQBVfIHZp',
  // UI shows "Equipment" but the doc has "Equipments"; map both to same ID
  'Equipment': 'z5BRrsDIy92XEK1PzdM4',
  'Equipments': 'z5BRrsDIy92XEK1PzdM4',
};

// Optional: map some subcategory names to IDs if known (placeholder until real IDs provided)
const SUBCATEGORY_NAME_TO_ID: Record<string, string> = {
  // TODO: replace with real subcategory IDs when available
  'Bonding Agents': 'OEtF1TsohK0Re8RT9rOf',
};

interface InventoryTabProps {
  sellerId?: string; // filter by seller id
}

const mockItems: InventoryItem[] = [
  { id: 'it-1', name: 'Alginate Powder', suggestedThreshold: 5, inStock: 12, unit: 'bag', updatedAt: Date.now() - 86400000 },
  { id: 'it-2', name: 'Impression Tray Size M', suggestedThreshold: 20, inStock: 18, unit: 'pcs', updatedAt: Date.now() - 3600000 },
  { id: 'it-3', name: 'Composite A2', suggestedThreshold: 10, inStock: 7, unit: 'syringe', updatedAt: Date.now() - 7200000 },
];

const InventoryTab: React.FC<InventoryTabProps> = ({ sellerId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { filtered, query, setQuery, draft, selectItem, setDelta, setReason, resetDraft } = useInventory(items);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'active' | 'stockout' | 'listing'>('add');

  // Auth + toast
  const { uid, isSeller, isAdmin } = useAuth();
  const { toast } = useToast();

  // Image upload state
  // removed: immediate uploading flag; we only preview before create
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Admin seller picker state
  const [sellers, setSellers] = useState<Array<{ uid: string; name?: string; email: string }>>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  // Compute effective sellerId for data ops
  const effectiveSellerId = sellerId ?? (isSeller ? uid : selectedSellerId);

  // Add Product modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    imageUrl: string; // persisted URL after create
    // New: local selection before upload
    imageFile?: File | null;
    imagePreview?: string | null;
    category: string;
    subcategory: string;
    price: number;
    specialPrice: number;
    sku: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    suggestedThreshold: number;
    unit: string;
    inStock: number;
  }>({
    name: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    imagePreview: null,
    category: '',
    subcategory: '',
    price: 0,
    specialPrice: 0,
    sku: '',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    suggestedThreshold: 0,
    unit: '',
    inStock: 0,
  });
  const resetNewItem = () => setNewItem({
    name: '', description: '', imageUrl: '', imageFile: null, imagePreview: null, category: '', subcategory: '', price: 0, specialPrice: 0, sku: '', weight: 0,
    dimensions: { length: 0, width: 0, height: 0 }, suggestedThreshold: 0, unit: '', inStock: 0,
  });

  // Availability / preorder for simple product
  const [available, setAvailable] = useState(true);
  const [preOrder, setPreOrder] = useState(false);

  // Variant state (manual rows only) + local preview fields
  const [variants, setVariants] = useState<Array<{ key: string; options: Record<string, string>; price: number; stock: number; sku?: string; specialPrice?: number; available?: boolean; imageUrl?: string; imageFile?: File | null; imagePreview?: string | null }>>([]);
  // removed: variantUploading flag; previews only before create
  const variantFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  // When a new variant is added, auto-trigger its file picker
  const [pendingVariantPick, setPendingVariantPick] = useState<string | null>(null);

  const triggerVariantFilePick = (key: string) => {
    if (!variantFileInputs.current[key]) return;
    variantFileInputs.current[key]!.click();
  };

  useEffect(() => {
    if (!pendingVariantPick) return;
    const el = variantFileInputs.current[pendingVariantPick];
    if (el) {
      el.click();
      setPendingVariantPick(null);
    }
  }, [variants, pendingVariantPick]);

  const handleVariantFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setVariants((list) => list.map(v => {
      if (v.key !== key) return v;
      // Revoke previous preview if existed
      if (v.imagePreview) URL.revokeObjectURL(v.imagePreview);
      return { ...v, imageFile: file, imagePreview: preview };
    }));
    if (variantFileInputs.current[key]) variantFileInputs.current[key]!.value = '';
  };

  // New: add a blank variant row (manual variant)
  const addBlankVariant = () => {
    const key = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setVariants((prev) => [...prev, { key, options: {}, price: 0, stock: 0, sku: undefined, specialPrice: 0, available: true, imageUrl: undefined, imageFile: null, imagePreview: null }]);
    setPendingVariantPick(key);
  };

  // Load sellers for admin to choose
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isAdmin) return;
      try {
        const rows = await getWebUsers(['seller' as any]);
        if (!mounted) return;
        const mapped = rows.map(u => ({ uid: (u as any).uid, name: (u as any).name, email: (u as any).email }));
        setSellers(mapped);
        // Auto-select first seller if none picked yet
        if (!selectedSellerId && mapped.length > 0) {
          setSelectedSellerId(mapped[0].uid);
        }
      } catch (e) {
        console.error('Failed to load sellers', e);
        toast({ title: 'Failed to load sellers', description: 'Please try again later.' });
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  // Subscribe to inventory for effective seller
  useEffect(() => {
    if (!effectiveSellerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = InventoryService.listenBySeller(effectiveSellerId, (rows) => {
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [effectiveSellerId]);

  const handleSubmit = useCallback(async () => {
    if (!draft.itemId || !draft.reason || draft.delta === 0) return;
    try {
      setSubmitting(true);
      await InventoryService.adjustStock(draft.itemId, draft.delta, draft.reason);
      resetDraft();
      toast({ title: 'Stock updated', description: 'Your stock adjustment has been recorded.' });
    } catch (e) {
      console.error('Adjust stock failed', e);
      toast({ title: 'Failed to adjust stock', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [draft, resetDraft]);

  const handleCreateItem = useCallback(async () => {
    if (!effectiveSellerId) {
      toast({ title: 'Select a seller first', description: 'Choose a seller to create items under.' });
      return;
    }
    if (!newItem.name.trim()) {
      toast({ title: 'Name is required' });
      return;
    }
    try {
      setSubmitting(true);

      // Upload images now (product + variants), using previews selected earlier
      let productImageUrl: string | undefined = newItem.imageUrl?.trim() || undefined;
      let imageVersion: string | null = null;
      if (newItem.imageFile) {
        const ts = Date.now().toString();
        const safeName = encodeURIComponent(newItem.imageFile.name);
        const p = `ProductImages/${ts}/${safeName}`;
        const r = storageRef(storage, p);
        await uploadBytes(r, newItem.imageFile);
        productImageUrl = await getDownloadURL(r);
        imageVersion = ts;
      }

      // Prepare variants payload first and capture variant image versions
      const variationImageVersions: Record<string, string> = {};
      const variantsToSave = [] as Array<{ key: string; options: Record<string, string>; price: number; stock: number; sku?: string; specialPrice?: number; available?: boolean; imageUrl?: string }>;
      for (let idx = 0; idx < variants.length; idx++) {
        const v = variants[idx];
        let vUrl = v.imageUrl;
        if (v.imageFile) {
          const ts = Date.now().toString();
          const safeV = encodeURIComponent(v.imageFile.name);
          const path = `ProductImages/${effectiveSellerId}/variants/${ts}_${safeV}`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, v.imageFile);
          vUrl = await getDownloadURL(ref);
          variationImageVersions[String(idx)] = ts;
        }
        variantsToSave.push({ key: v.key, options: v.options, price: Number(v.price) || 0, stock: Number(v.stock) || 0, sku: v.sku, specialPrice: v.specialPrice, available: v.available, imageUrl: vUrl });
      }

      // Compute lowestPrice for Product
      const lowestPrice = variantsToSave.length > 0
        ? Math.min(...variantsToSave.map(v => (v.specialPrice != null && v.specialPrice > 0 ? Number(v.specialPrice) : Number(v.price)) || 0))
        : (newItem.specialPrice && newItem.specialPrice > 0 ? Number(newItem.specialPrice) : Number(newItem.price) || 0);

      // Create Product document (catalog) with required schema
      const productRef = await ProductService.createProduct({
        sellerId: effectiveSellerId!,
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        imageURL: productImageUrl || '',
        imageVersion,
        categoryID: CATEGORY_NAME_TO_ID[newItem.category] || null,
        subCategoryID: SUBCATEGORY_NAME_TO_ID[newItem.subcategory] || null,
        isActive: true,
        clickCounter: 0,
        lowestPrice,
        variationImageVersions,
      });

      // Add Variation subcollection under Product (always create at least one)
      const variationsForProduct = (variantsToSave.length > 0)
        ? variantsToSave.map((v, i) => ({
            sku: v.sku,
            price: v.specialPrice != null && v.specialPrice > 0 ? Number(v.specialPrice) : Number(v.price),
            stock: v.stock,
            weight: newItem.weight || undefined,
            dimensions: newItem.dimensions || undefined,
            imageURL: v.imageUrl || null,
            name: `batch${i}`,
          }))
        : [{
            sku: newItem.sku || undefined,
            price: (newItem.specialPrice && newItem.specialPrice > 0 ? Number(newItem.specialPrice) : Number(newItem.price) || 0),
            stock: Number(newItem.inStock) || 0,
            weight: newItem.weight || undefined,
            dimensions: newItem.dimensions || undefined,
            imageURL: productImageUrl || null,
            name: 'default',
          }];

      await ProductService.addVariations(productRef.id, variationsForProduct);

      await InventoryService.createItem({
        sellerId: effectiveSellerId!,
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        imageUrl: productImageUrl,
        category: newItem.category.trim() || undefined,
        subcategory: newItem.subcategory.trim() || undefined,
        price: Number(newItem.price) || 0,
        specialPrice: Number(newItem.specialPrice) || undefined,
        sku: newItem.sku.trim() || undefined,
        weight: Number(newItem.weight) || 0,
        dimensions: { length: Number(newItem.dimensions.length)||0, width: Number(newItem.dimensions.width)||0, height: Number(newItem.dimensions.height)||0 },
        suggestedThreshold: Number(newItem.suggestedThreshold) || 0,
        unit: newItem.unit.trim() || undefined,
        inStock: Number(newItem.inStock) || 0,
        hasVariants: variantsToSave.length > 0,
        variants: variantsToSave,
        available,
        preOrder,
      });

      // Revoke product preview URL if set
      if (newItem.imagePreview) URL.revokeObjectURL(newItem.imagePreview);
      // Revoke all variant previews
      variants.forEach(v => { if (v.imagePreview) URL.revokeObjectURL(v.imagePreview); });

      setShowAdd(false);
      resetNewItem();
      setVariants([]);
      setActiveTab('add');
      toast({ title: 'Product created', description: `${newItem.name} has been added to inventory.` });
    } catch (e) {
      console.error('Create item failed', e);
      toast({ title: 'Failed to create product', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [newItem, effectiveSellerId, variants, available, preOrder]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setNewItem((s) => {
      if (s.imagePreview) URL.revokeObjectURL(s.imagePreview);
      return { ...s, imageFile: file, imagePreview: preview };
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
            <div className="flex gap-3 items-center">
              {/* Admin seller selector */}
              {isAdmin && (
                <div className="w-64">
                  <select
                    value={selectedSellerId ?? ''}
                    onChange={(e) => setSelectedSellerId(e.target.value || null)}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select seller...</option>
                    {sellers.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.name || s.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="w-64">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="whitespace-nowrap px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                disabled={!effectiveSellerId}
                title={!effectiveSellerId ? 'Select a seller to add products' : ''}
              >
                + Add Product
              </button>
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
            disabled={submitting || loading}
          />

          {/* Inventory Table */}
          <InventoryTable items={filtered} onSelect={selectItem} activeId={draft.itemId} />
        </div>
      )}

      {/* Tab Content */}
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

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setShowAdd(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900">Add Product</h3>
            <p className="text-sm text-gray-500 mb-4">Create a new inventory item.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                  <input
                    value={newItem.name}
                    onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. Alginate Powder"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                  <input
                    value={newItem.sku}
                    onChange={(e) => setNewItem((s) => ({ ...s, sku: e.target.value }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g. SKU-ALG-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem((s) => ({ ...s, description: e.target.value }))}
                  className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="Short product description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Image</label>
                  <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <button
                      type="button"
                      onClick={handlePickImage}
                      className="px-3 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
                      disabled={!effectiveSellerId}
                    >
                      {(newItem.imagePreview || newItem.imageUrl) ? 'Replace Image' : 'Add Image'}
                    </button>
                    {(newItem.imagePreview || newItem.imageUrl) && (
                      <img src={newItem.imagePreview || newItem.imageUrl} alt="preview" className="h-10 w-10 rounded object-cover border" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value, subcategory: '' }))}
                      className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select category...</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
                    <select
                      value={newItem.subcategory}
                      onChange={(e) => setNewItem((s) => ({ ...s, subcategory: e.target.value }))}
                      className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={!newItem.category}
                    >
                      <option value="">Select subcategory...</option>
                      {(newItem.category ? SUBCATEGORY_OPTIONS[newItem.category as typeof CATEGORY_OPTIONS[number]] : []).map((sc) => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem((s) => ({ ...s, price: Number(e.target.value) }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                  <input
                    type="number"
                    value={newItem.weight}
                    onChange={(e) => setNewItem((s) => ({ ...s, weight: Number(e.target.value) }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input
                    value={newItem.unit}
                    onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="pcs, box"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Length</label>
                  <input
                    type="number"
                    value={newItem.dimensions.length}
                    onChange={(e) => setNewItem((s) => ({ ...s, dimensions: { ...s.dimensions, length: Number(e.target.value) } }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Width</label>
                  <input
                    type="number"
                    value={newItem.dimensions.width}
                    onChange={(e) => setNewItem((s) => ({ ...s, dimensions: { ...s.dimensions, width: Number(e.target.value) } }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Height</label>
                  <input
                    type="number"
                    value={newItem.dimensions.height}
                    onChange={(e) => setNewItem((s) => ({ ...s, dimensions: { ...s.dimensions, height: Number(e.target.value) } }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Suggested Threshold</label>
                  <input
                    type="number"
                    value={newItem.suggestedThreshold}
                    onChange={(e) => setNewItem((s) => ({ ...s, suggestedThreshold: Number(e.target.value) }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newItem.inStock}
                    onChange={(e) => setNewItem((s) => ({ ...s, inStock: Number(e.target.value) }))}
                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div className="hidden md:block"/>
              </div>

              {/* Price, Stock & Variants */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Price, Stock & Variants</h4>
                    <p className="text-xs text-gray-500">Add variant rows to set per-variant price and stock.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                      onClick={addBlankVariant}
                    >
                      + Add Variant
                    </button>
                    {/* Removed header-level Add Image button */}
                  </div>
                </div>

                {/* Simple product price/stock if no variants */}
                {variants.length === 0 && (
                  <div className="border rounded overflow-hidden">
                    <div className="grid grid-cols-6 text-xs bg-gray-50">
                      <div className="p-2 font-medium text-gray-600">Image</div>
                      <div className="p-2 font-medium text-gray-600">Price</div>
                      <div className="p-2 font-medium text-gray-600">Special Price</div>
                      <div className="p-2 font-medium text-gray-600">Stock</div>
                      <div className="p-2 font-medium text-gray-600">SellerSKU</div>
                      <div className="p-2 font-medium text-gray-600">Availability</div>
                    </div>
                    <div className="grid grid-cols-6 items-center text-xs">
                      <div className="p-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          onClick={handlePickImage}
                          title="Choose product image"
                          disabled={!effectiveSellerId}
                        >
                          {(newItem.imagePreview || newItem.imageUrl) ? 'Replace Image' : 'Add Image'}
                        </button>
                        {(newItem.imagePreview || newItem.imageUrl) && (
                          <img src={newItem.imagePreview || newItem.imageUrl} alt="preview" className="inline-block ml-2 h-8 w-8 rounded object-cover border" />
                        )}
                      </div>
                      <div className="p-2"><input type="number" value={newItem.price} onChange={(e)=> setNewItem(s=> ({...s, price: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                      <div className="p-2"><input type="number" value={newItem.specialPrice} onChange={(e)=> setNewItem(s=> ({...s, specialPrice: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                      <div className="p-2"><input type="number" value={newItem.inStock} onChange={(e)=> setNewItem(s=> ({...s, inStock: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                      <div className="p-2"><input value={newItem.sku} onChange={(e)=> setNewItem(s=> ({...s, sku: e.target.value}))} className="w-full p-1 border rounded" /></div>
                      <div className="p-2"><input type="checkbox" className="accent-teal-600" checked={available} onChange={(e)=> setAvailable(e.target.checked)} /></div>
                    </div>
                  </div>
                )}

                {/* Variants grid (manual) */}
                {variants.length > 0 && (
                  <div className="mt-4 overflow-auto border rounded">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-600">Image</th>
                          <th className="text-left p-2 font-medium text-gray-600">Price</th>
                          <th className="text-left p-2 font-medium text-gray-600">Special Price</th>
                          <th className="text-left p-2 font-medium text-gray-600">Stock</th>
                          <th className="text-left p-2 font-medium text-gray-600">SellerSKU</th>
                          <th className="text-left p-2 font-medium text-gray-600">Availability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, idx) => (
                          <tr key={v.key} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2">
                              <input
                                type="file"
                                accept="image/*"
                                ref={(el) => { variantFileInputs.current[v.key] = el; }}
                                className="hidden"
                                onChange={(e) => handleVariantFileChange(v.key, e)}
                              />
                              <button
                                type="button"
                                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                                onClick={() => triggerVariantFilePick(v.key)}
                                disabled={!effectiveSellerId}
                              >
                                {(v.imagePreview || v.imageUrl) ? 'Replace' : 'Add Image'}
                              </button>
                              {(v.imagePreview || v.imageUrl) && (
                                <img src={v.imagePreview || v.imageUrl} alt="variant" className="inline-block ml-2 h-8 w-8 rounded object-cover border" />
                              )}
                            </td>
                            <td className="p-2">
                              <input type="number" value={v.price} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, price: Number(e.target.value)}:x))} className="w-24 p-1 border rounded" />
                            </td>
                            <td className="p-2">
                              <input type="number" value={(v as any).specialPrice || 0} onChange={(e)=> setVariants((list)=> list.map((x)=> x.key===v.key?{...x, specialPrice: Number(e.target.value)}:x))} className="w-24 p-1 border rounded" />
                            </td>
                            <td className="p-2">
                              <input type="number" value={v.stock} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, stock: Number(e.target.value)}:x))} className="w-20 p-1 border rounded" />
                            </td>
                            <td className="p-2">
                              <input value={v.sku || ''} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, sku: e.target.value}:x))} className="w-32 p-1 border rounded" />
                            </td>
                            <td className="p-2">
                              <input type="checkbox" className="accent-teal-600" checked={(v as any).available ?? true} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, available: e.target.checked}:x))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* end Price, Stock & Variants */}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                onClick={() => setShowAdd(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40"
                onClick={handleCreateItem}
                disabled={submitting || !newItem.name.trim()}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
