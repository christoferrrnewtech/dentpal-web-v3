import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import CatalogTable from './CatalogTable';
import { CalendarClock } from 'lucide-react';

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

// New: shared item status type for UI
type ItemStatus = 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';

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
  const [catalogTab, setCatalogTab] = useState<'all' | 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted'>('all');
  const [filterName, setFilterName] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'updatedAt'>('name');

  // History tab state
  const [history, setHistory] = useState<Array<{ id: string; adjustmentNo: string; dateISO: string; reason: string; itemName: string; stockAfter: number }>>([]);
  const [historyDate, setHistoryDate] = useState<string>('');
  const [historyReason, setHistoryReason] = useState<string>('');

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
    // Switched: use Product as the source of truth
    const unsub = ProductService.listenBySeller(effectiveSellerId, (rows) => {
      // Map product rows to InventoryItem-like shape used by the table
      const mapped = rows.map(r => ({
        id: r.id,
        name: r.name,
        suggestedThreshold: 0,
        inStock: r.inStock,
        unit: undefined,
        updatedAt: r.updatedAt,
        description: '',
        imageUrl: r.imageUrl,
        category: undefined,
        subcategory: undefined,
        variations: [],
        price: r.price,
        specialPrice: r.specialPrice,
        status: r.status,
        sku: undefined,
        weight: undefined,
        dimensions: undefined,
        available: true,
        preOrder: false,
        hasVariants: true,
        variants: [],
      }));
      setItems(mapped as any);
      setLoading(false);
    });
    return () => unsub();
  }, [effectiveSellerId]);

  // Subscribe to adjustments for effective seller
  useEffect(() => {
    if (!effectiveSellerId) { setHistory([]); return; }
    const unsub = InventoryService.listenAdjustmentsBySeller(effectiveSellerId, (rows) => {
      setHistory(rows);
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

      // Removed: do not create inventory_items entry; Product is the source of truth
      // await InventoryService.createItem({ ... })

      // Revoke product preview URL if set
      if (newItem.imagePreview) URL.revokeObjectURL(newItem.imagePreview);
      // Revoke all variant previews
      variants.forEach(v => { if (v.imagePreview) URL.revokeObjectURL(v.imagePreview); });

      setShowAdd(false);
      resetNewItem();
      setVariants([]);
      setActiveTab('add');
      toast({ title: 'Product created', description: `${newItem.name} has been added to catalog.` });
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

  // Compute filtered catalog items based on current tab and filters
  const filteredCatalog = useMemo(() => {
    const nameQuery = (filterName || '').trim().toLowerCase();
    return items
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
        return (i.category || '') === filterCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'stock') {
          const diff = (Number(b.inStock || 0) - Number(a.inStock || 0));
          if (diff !== 0) return diff;
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'updatedAt') {
          const diff = (Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
          if (diff !== 0) return diff;
          return (a.name || '').localeCompare(b.name || '');
        }
        // default: name asc
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [items, catalogTab, filterName, filterCategory, sortBy]);

  // Edit flow: open item data in form
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load item into form for editing
  const openEdit = useCallback(async (id: string) => {
    setSubmitting(true);
    try {
      // Fetch from Product + Variation instead of legacy inventory_items
      const detail = await ProductService.getProductDetail(id);
      if (!detail) { setSubmitting(false); return; }
      const p: any = detail.product;
      const vars: any[] = Array.isArray(detail.variations) ? detail.variations : [];

      // Prefill product-level fields
      setNewItem({
        name: String(p.name || ''),
        description: String(p.description || ''),
        imageUrl: String(p.imageURL || ''),
        imageFile: null,
        imagePreview: null,
        category: '', // unknown without reverse lookup
        subcategory: '', // unknown without reverse lookup
        price: Number(p.price ?? 0) || 0,
        specialPrice: Number(p.specialPrice ?? 0) || 0,
        sku: '',
        // Take weight/dimensions from first variation if present
        weight: vars.length ? Number(vars[0].weight || vars[0]?.dimension?.weight || 0) : 0,
        dimensions: {
          length: Number(vars[0]?.dimensions?.length || 0),
          width: Number(vars[0]?.dimensions?.width || 0),
          height: Number(vars[0]?.dimensions?.height || 0),
        },
        suggestedThreshold: 0,
        unit: '',
        inStock: vars.reduce((sum, v: any) => sum + (Number(v.stock || 0)), 0),
      });

      // Prefill variants from Variation subcollection
      setVariants(vars.map((v: any, i: number) => ({
        key: v.id || `var-${i}`,
        options: {},
        price: Number(v.price || 0),
        stock: Number(v.stock || 0),
        sku: v.sku || v.SKU || undefined,
        specialPrice: undefined, // per-variation discount not modeled yet
        available: true,
        imageUrl: v.imageURL || undefined,
        imageFile: null,
        imagePreview: null,
      })));

      setAvailable(true);
      setPreOrder(false);
      setEditingId(id);
      setShowAdd(true);
    } catch (e) {
      console.error('Open edit failed', e);
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Open a fresh Add Product modal (ensure no edit state bleeds over)
  const openAddNew = useCallback(() => {
    // Revoke previews if any
    if (newItem.imagePreview) URL.revokeObjectURL(newItem.imagePreview);
    variants.forEach(v => { if (v.imagePreview) URL.revokeObjectURL(v.imagePreview); });
    setEditingId(null);
    resetNewItem();
    setVariants([]);
    setAvailable(true);
    setPreOrder(false);
    setShowAdd(true);
  }, [newItem.imagePreview, variants]);

  // Submit handler decides create vs update
  const handleSaveItem = useCallback(async (statusOverride?: ItemStatus) => {
    if (!effectiveSellerId) {
      toast({ title: 'Select a seller first', description: 'Choose a seller to save items under.' });
      return;
    }
    if (!newItem.name.trim()) {
      toast({ title: 'Name is required' });
      return;
    }
    try {
      setSubmitting(true);

      // Upload any newly selected images
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

      // Prepare variants payload and upload new variant images if any
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
        }
        variantsToSave.push({ key: v.key, options: v.options, price: Number(v.price) || 0, stock: Number(v.stock) || 0, sku: v.sku, specialPrice: v.specialPrice, available: v.available, imageUrl: vUrl });
      }

      if (editingId) {
        // Update existing Product (basic fields only for now)
        await ProductService.updateProduct(editingId, {
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          ...(productImageUrl !== undefined ? { imageURL: productImageUrl } : {} as any),
          // category mapping omitted until reverse map is available
          ...(statusOverride ? { status: statusOverride } : {} as any),
        });
        // Note: variation updates not yet implemented in this flow
      } else {
        // Create new product in Product collection (not inventory_items)
        await handleCreateItem();
        return;
      }

      // Cleanup previews
      if (newItem.imagePreview) URL.revokeObjectURL(newItem.imagePreview);
      variants.forEach(v => { if (v.imagePreview) URL.revokeObjectURL(v.imagePreview); });

      setShowAdd(false);
      setEditingId(null);
      resetNewItem();
      setVariants([]);
      if (statusOverride === 'draft') setCatalogTab('draft');
      toast({ title: 'Product updated', description: `${newItem.name} has been updated.` });
    } catch (e) {
      console.error('Save item failed', e);
      toast({ title: 'Failed to save product', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [newItem, effectiveSellerId, variants, available, preOrder, editingId]);

  // Counts for status badges
  const statusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0, draft: 0, pending_qc: 0, violation: 0, deleted: 0 } as const;
    const acc: Record<keyof typeof counts, number> = { active: 0, inactive: 0, draft: 0, pending_qc: 0, violation: 0, deleted: 0 };
    items.forEach((i) => {
      const s = (i.status ?? 'active') as keyof typeof counts;
      if (s in acc) acc[s] += 1;
    });
    return acc;
  }, [items]);

  // Price editing dialog state
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceEditingItem, setPriceEditingItem] = useState<InventoryItem | null>(null);
  const [priceForm, setPriceForm] = useState<{ price: number | '' ; specialPrice: number | '' ; promoMode: 'long' | 'dated'; start?: string; end?: string }>({ price: '', specialPrice: '', promoMode: 'long', start: undefined, end: undefined });

  // New: inline stock adjust dialog state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockEditingItem, setStockEditingItem] = useState<InventoryItem | null>(null);
  const [stockForm, setStockForm] = useState<{ delta: number | ''; reason: string }>({ delta: '', reason: '' });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const openPriceDialog = (item: InventoryItem) => {
    setPriceEditingItem(item);
    setPriceForm({
      price: Number(item.price ?? 0) || 0,
      specialPrice: Number(item.specialPrice ?? 0) || 0,
      promoMode: item?.promoStart && item?.promoEnd ? 'dated' : 'long',
      start: item?.promoStart ? new Date(item.promoStart).toISOString().slice(0,10) : undefined,
      end: item?.promoEnd ? new Date(item.promoEnd).toISOString().slice(0,10) : undefined,
    });
    setPriceDialogOpen(true);
  };

  // Restored: save price dialog
  const savePriceDialog = async () => {
    if (!priceEditingItem) return;
    try {
      setSubmitting(true);
      const payload: any = {
        price: priceForm.price === '' ? null : Number(priceForm.price),
        specialPrice: priceForm.specialPrice === '' ? null : Number(priceForm.specialPrice),
        promoStart: null as number | null,
        promoEnd: null as number | null,
      };
      if (priceForm.promoMode === 'dated') {
        const startMs = priceForm.start ? new Date(priceForm.start + 'T00:00:00').getTime() : null;
        const endMs = priceForm.end ? new Date(priceForm.end + 'T23:59:59').getTime() : null;
        payload.promoStart = startMs;
        payload.promoEnd = endMs;
      }
      await ProductService.updatePriceAndPromo(priceEditingItem.id, payload);
      setPriceDialogOpen(false);
      setPriceEditingItem(null);
      toast({ title: 'Price updated', description: 'The product pricing has been saved.' });
    } catch (e) {
      console.error('Update price failed', e);
      toast({ title: 'Failed to update price', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // New: open stock dialog
  const openStockDialog = (item: InventoryItem) => {
    setStockEditingItem(item);
    setStockForm({ delta: '', reason: '' });
    setStockDialogOpen(true);
  };

  const saveStockDialog = async () => {
    if (!stockEditingItem) return;
    const deltaNum = stockForm.delta === '' ? 0 : Number(stockForm.delta);
    if (!deltaNum || !stockForm.reason) return;
    try {
      setSubmitting(true);
      // TODO: Stock is tracked at Variation level. Implement variation selection and update here.
      console.warn('Stock adjust attempted, but variation-level updates are not yet implemented.');
      toast({ title: 'Coming soon', description: 'Stock is managed per-variation. Update via the product edit until inline variation stock is added.' });
      setStockDialogOpen(false);
      setStockEditingItem(null);
    } catch (e) {
      console.error('Adjust stock failed', e);
      toast({ title: 'Failed to adjust stock', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (item: InventoryItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* New Catalog Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
          { key: 'draft', label: 'Draft' },
          { key: 'pending_qc', label: 'Pending QC' },
          { key: 'violation', label: 'Violation' },
          { key: 'deleted', label: 'Deleted' },
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

      {/* Filters */}
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
          <option value="stock">Sort by: Stock</option>
          <option value="updatedAt">Sort by: Updated</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={openAddNew}
          className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          disabled={!effectiveSellerId}
        >
          + Add Product
        </button>
      </div>

      {/* Catalog Table */}
      <CatalogTable
        items={filteredCatalog}
        onToggleActive={async (id, next) => {
          await ProductService.toggleActive(id, next);
        }}
        onEdit={openEdit}
        onEditPrice={openPriceDialog}
        onEditStock={openStockDialog}
        onDelete={(item) => { setDeleteTarget(item); setDeleteDialogOpen(true); }}
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

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteDialogOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete product</h3>
            <p className="text-xs text-gray-600 mb-4">Are you sure you want to delete this product? It will be moved to the Deleted tab and can be restored later.</p>
            <div className="p-3 border rounded-lg bg-gray-50 mb-4">
              <div className="text-xs text-gray-500 mb-1">Product</div>
              <div className="text-sm font-medium text-gray-900">{deleteTarget.name}</div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={() => setDeleteDialogOpen(false)}>Cancel</button>
              <button
                className="px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={async () => {
                  try {
                    await ProductService.markDeleted(deleteTarget.id);
                    setDeleteDialogOpen(false);
                    setDeleteTarget(null);
                    setCatalogTab('deleted');
                    toast({ title: 'Product deleted', description: 'Moved to Deleted tab.' });
                  } catch (e) {
                    console.error('Delete failed', e);
                    toast({ title: 'Failed to delete', description: 'Please try again.' });
                  }
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Price Dialog */}
      {priceDialogOpen && priceEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setPriceDialogOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit Price</h3>
            <p className="text-xs text-gray-500 mb-4">Update retail and discount price. Optionally schedule a promotion.</p>
            <div className="space-y-4">
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">Product</div>
                <div className="text-sm font-medium text-gray-900">{priceEditingItem.name}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Retail Price</label>
                  <input type="number" value={priceForm.price} onChange={(e)=> setPriceForm(s=> ({...s, price: e.target.value === '' ? '' : Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discount Price</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={priceForm.specialPrice} onChange={(e)=> setPriceForm(s=> ({...s, specialPrice: e.target.value === '' ? '' : Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    <button type="button" className="p-2 rounded border border-gray-200 hover:bg-gray-50" title="Promotion schedule" onClick={()=> setPriceForm(s=> ({...s, promoMode: s.promoMode === 'long' ? 'dated' : 'long'}))}>
                      <CalendarClock className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Promotion schedule */}
              {priceForm.promoMode === 'dated' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                    <input type="date" value={priceForm.start || ''} onChange={(e)=> setPriceForm(s=> ({...s, start: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input type="date" value={priceForm.end || ''} onChange={(e)=> setPriceForm(s=> ({...s, end: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={()=> setPriceDialogOpen(false)} disabled={submitting}>Cancel</button>
              <button className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40" onClick={savePriceDialog} disabled={submitting}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Dialog */}
      {stockDialogOpen && stockEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setStockDialogOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Adjust Stock</h3>
            <p className="text-xs text-gray-500 mb-4">Increase or decrease available stock for this item.</p>
            <div className="space-y-4">
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">Product</div>
                <div className="text-sm font-medium text-gray-900">{stockEditingItem.name}</div>
                <div className="text-xs text-gray-500">Current stock: <span className="font-semibold text-gray-700">{stockEditingItem.inStock}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Delta</label>
                  <input type="number" value={stockForm.delta} onChange={(e)=> setStockForm(s=> ({...s, delta: e.target.value === '' ? '' : Number(e.target.value)}))} placeholder="e.g. +5 or -2" className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                  <select value={stockForm.reason} onChange={(e)=> setStockForm(s=> ({...s, reason: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option value="">Select reason</option>
                    {['Restock','Correction','Damage','Expiration','Return'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={()=> setStockDialogOpen(false)} disabled={submitting}>Cancel</button>
              <button className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40" onClick={saveStockDialog} disabled={submitting || stockForm.delta === '' || !stockForm.reason}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Existing modals and forms remain available */}
      {/* Add/Edit Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && (setShowAdd(false), setEditingId(null))} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Product' : 'Add Product'}</h3>
            <p className="text-sm text-gray-500 mb-4">{editingId ? 'Update the product details.' : 'Create a new inventory item.'}</p>
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
                onClick={() => { setShowAdd(false); setEditingId(null); }}
                disabled={submitting}
              >
                Cancel
              </button>
              {/* New: Save as Draft button */}
              <button
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                onClick={() => handleSaveItem('draft')}
                disabled={submitting || !newItem.name.trim()}
                title="Save this product as a draft"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40"
                onClick={() => handleSaveItem()}
                disabled={submitting || !newItem.name.trim()}
              >
                {submitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryTab;
