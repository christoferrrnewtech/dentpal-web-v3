import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import ProductService from '@/services/product';
import { getWebUsers } from '@/services/webUserService';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Category and subcategory options (copied from Inventory form)
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

// Map UI names to Firestore document IDs (same mapping used elsewhere)
const CATEGORY_NAME_TO_ID: Record<string, string> = {
  Disposables: 'EsDNnmc72LZNMHk3SmeV',
  'Dental Equipment': 'PtqCTLGduo6vay2umpMY',
  Consumables: 'iXMJ7vcFIcMjQBVfIHZp',
  Equipment: 'z5BRrsDIy92XEK1PzdM4',
  Equipments: 'z5BRrsDIy92XEK1PzdM4',
};

const SUBCATEGORY_NAME_TO_ID: Record<string, string> = {
  // TODO: replace with real subcategory IDs when available
  'Bonding Agents': 'OEtF1TsohK0Re8RT9rOf',
};

type ItemStatus = 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uid, isSeller, isAdmin } = useAuth();

  // Admin seller picker
  const [sellers, setSellers] = useState<Array<{ uid: string; name?: string; email: string }>>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const effectiveSellerId = isSeller ? uid : selectedSellerId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isAdmin) return;
      try {
        const rows = await getWebUsers(['seller' as any]);
        if (!mounted) return;
        const mapped = rows.map((u: any) => ({ uid: u.uid, name: u.name, email: u.email }));
        setSellers(mapped);
        if (!selectedSellerId && mapped.length > 0) setSelectedSellerId(mapped[0].uid);
      } catch (e) {
        console.error('Failed to load sellers', e);
        toast({ title: 'Failed to load sellers', description: 'Please try again later.' });
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [available, setAvailable] = useState<boolean>(true);
  const [preOrder, setPreOrder] = useState<boolean>(false);
  const [showErrors, setShowErrors] = useState(false);

  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    imageUrl: string;
    imageFile?: File | null;
    imagePreview?: string | null;
    category: string;
    subcategory: string;
    price: number;
    specialPrice: number;
    sku: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    // New: units for weight and dimensions
    weightUnit: 'g' | 'kg' | '';
    dimensionUnit: 'mm' | 'cm' | 'in' | '';
    suggestedThreshold: number;
    unit: string;
    inStock: number;
    simpleVariantName?: string;
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
    // New defaults: kg and cm
    weightUnit: 'kg',
    dimensionUnit: 'cm',
    suggestedThreshold: 0,
    unit: '',
    inStock: 0,
    simpleVariantName: '',
  });

  const resetNewItem = () => setNewItem({
    name: '', description: '', imageUrl: '', imageFile: null, imagePreview: null, category: '', subcategory: '', price: 0, specialPrice: 0, sku: '', weight: 0,
    dimensions: { length: 0, width: 0, height: 0 }, weightUnit: 'kg', dimensionUnit: 'cm', suggestedThreshold: 0, unit: '', inStock: 0, simpleVariantName: '',
  });

  const variantFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingVariantPick, setPendingVariantPick] = useState<string | null>(null);
  const [variants, setVariants] = useState<Array<{ key: string; options: Record<string, string>; price: number; stock: number; sku?: string; specialPrice?: number; available?: boolean; imageUrl?: string; imageFile?: File | null; imagePreview?: string | null; name?: string }>>([]);

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
      if (v.imagePreview) URL.revokeObjectURL(v.imagePreview);
      return { ...v, imageFile: file, imagePreview: preview };
    }));
    if (variantFileInputs.current[key]) variantFileInputs.current[key]!.value = '';
  };

  const addBlankVariant = () => {
    const key = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setVariants((prev) => [...prev, { key, options: {}, price: 0, stock: 0, sku: undefined, specialPrice: 0, available: true, imageUrl: undefined, imageFile: null, imagePreview: null, name: '' }]);
    setPendingVariantPick(key);
  };

  const handlePickImage = () => fileInputRef.current?.click();

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

  // Validation: require all fields for Create action
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    // Seller (admin only)
    if (isAdmin && !selectedSellerId) errors.seller = 'Select a seller';

    // Product-level required fields
    if (!newItem.name?.trim()) errors.name = 'Product name is required';
    if (!newItem.sku?.trim() && (variants.length === 0)) errors.sku = 'SKU is required';
    if (!newItem.description?.trim()) errors.description = 'Description is required';
    if (!(newItem.imagePreview || newItem.imageUrl || newItem.imageFile)) errors.image = 'Product image is required';
    if (!newItem.category) errors.category = 'Category is required';
    if (!newItem.subcategory) errors.subcategory = 'Subcategory is required';

    // Numbers must be present and > 0 (or >=0 for stock)
    if (!(Number.isFinite(newItem.price) && newItem.price > 0) && variants.length === 0) errors.price = 'Price must be greater than 0';
    if (!(Number.isFinite(newItem.weight) && newItem.weight > 0)) errors.weight = 'Weight must be greater than 0';
    if (!newItem.weightUnit) errors.weightUnit = 'Weight unit is required';
    if (!newItem.unit?.trim()) errors.unit = 'Unit is required';
    if (!(Number.isFinite(newItem.dimensions.length) && newItem.dimensions.length > 0)) errors.length = 'Length must be greater than 0';
    if (!(Number.isFinite(newItem.dimensions.width) && newItem.dimensions.width > 0)) errors.width = 'Width must be greater than 0';
    if (!(Number.isFinite(newItem.dimensions.height) && newItem.dimensions.height > 0)) errors.height = 'Height must be greater than 0';
    if (!newItem.dimensionUnit) errors.dimensionUnit = 'Dimension unit is required';
    if (!(Number.isFinite(newItem.suggestedThreshold) && newItem.suggestedThreshold >= 0)) errors.threshold = 'Suggested threshold is required';

    if (variants.length === 0) {
      if (!(Number.isFinite(newItem.inStock) && newItem.inStock >= 0)) errors.inStock = 'Initial stock is required';
      // Optional: simpleVariantName can be required if you want
    } else {
      variants.forEach((v, i) => {
        if (!v.name?.trim()) errors[`variants.${i}.name`] = `Variant ${i + 1}: name is required`;
        if (!(Number.isFinite(v.price) && v.price > 0)) errors[`variants.${i}.price`] = `Variant ${i + 1}: price must be > 0`;
        if (!(Number.isFinite(v.stock) && v.stock >= 0)) errors[`variants.${i}.stock`] = `Variant ${i + 1}: stock must be ≥ 0`;
        if (!v.sku?.trim()) errors[`variants.${i}.sku`] = `Variant ${i + 1}: SKU is required`;
      });
    }

    return { errors, isValid: Object.keys(errors).length === 0 };
  }, [isAdmin, selectedSellerId, newItem, variants]);

  const handleCreateClick = () => {
    if (!validation.isValid) {
      setShowErrors(true);
      const messages = Object.values(validation.errors);
      const summary = messages.slice(0, 5).join(' • ');
      toast({ title: 'Please complete all required fields', description: summary || 'Missing required information' });
      return;
    }
    handleCreateItem();
  };

  const handleCreateItem = useCallback(async (createStatus?: ItemStatus) => {
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

      // Upload product image if selected
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

      // Prepare variants and upload any new variant images
      const variationImageVersions: Record<string, string> = {};
      const variantsToSave: Array<{ key: string; options: Record<string, string>; price: number; stock: number; sku?: string; specialPrice?: number; available?: boolean; imageUrl?: string; name?: string }>=[];
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
        variantsToSave.push({ key: v.key, options: v.options, price: Number(v.price) || 0, stock: Number(v.stock) || 0, sku: v.sku, specialPrice: v.specialPrice, available: v.available, imageUrl: vUrl, name: (v.name || '').trim() || undefined });
      }

      // Compute lowestPrice
      const lowestPrice = variantsToSave.length > 0
        ? Math.min(...variantsToSave.map(v => (v.specialPrice != null && v.specialPrice > 0 ? Number(v.specialPrice) : Number(v.price)) || 0))
        : (newItem.specialPrice && newItem.specialPrice > 0 ? Number(newItem.specialPrice) : Number(newItem.price) || 0);

      // Create Product
      const productRef = await ProductService.createProduct({
        sellerId: effectiveSellerId!,
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        imageURL: productImageUrl || '',
        imageVersion,
        categoryID: CATEGORY_NAME_TO_ID[newItem.category] || null,
        subCategoryID: SUBCATEGORY_NAME_TO_ID[newItem.subcategory] || null,
        isActive: createStatus === 'draft' ? false : true,
        status: createStatus === 'draft' ? 'draft' : undefined,
        clickCounter: 0,
        lowestPrice,
        variationImageVersions,
        suggestedThreshold: newItem.suggestedThreshold > 0 ? newItem.suggestedThreshold : null,
      } as any);

      // Add variations (at least one)
      const variationsForProduct = (variantsToSave.length > 0)
        ? variantsToSave.map((v, i) => ({
            sku: v.sku,
            price: v.specialPrice != null && v.specialPrice > 0 ? Number(v.specialPrice) : Number(v.price),
            stock: v.stock,
            // Persist weight and dimensions with units
            weight: newItem.weight || undefined,
            weightUnit: newItem.weightUnit || undefined,
            dimensions: newItem.dimensions || undefined,
            dimensionsUnit: newItem.dimensionUnit || undefined,
            imageURL: v.imageUrl || null,
            name: v.name?.trim() || `batch${i}`,
          }))
        : [{
            sku: newItem.sku || undefined,
            price: (newItem.specialPrice && newItem.specialPrice > 0 ? Number(newItem.specialPrice) : Number(newItem.price) || 0),
            stock: Number(newItem.inStock) || 0,
            // Persist weight and dimensions with units
            weight: newItem.weight || undefined,
            weightUnit: newItem.weightUnit || undefined,
            dimensions: newItem.dimensions || undefined,
            dimensionsUnit: newItem.dimensionUnit || undefined,
            imageURL: productImageUrl || null,
            name: (newItem.simpleVariantName || '').trim() || 'default',
          }];

      await ProductService.addVariations(productRef.id, variationsForProduct);

      // Cleanup previews
      if (newItem.imagePreview) URL.revokeObjectURL(newItem.imagePreview);
      variants.forEach(v => { if (v.imagePreview) URL.revokeObjectURL(v.imagePreview); });

      resetNewItem();
      setVariants([]);
      toast({ title: createStatus === 'draft' ? 'Draft saved' : 'Product created', description: `${newItem.name} ${createStatus === 'draft' ? 'has been saved as a draft.' : 'has been added to catalog.'}` });
      // Go back to Inventory tab
      navigate('/?tab=inventory');
    } catch (e) {
      console.error('Create item failed', e);
      toast({ title: 'Failed to create product', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [effectiveSellerId, newItem, variants]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Add Product</h1>
            <p className="text-sm text-gray-500">Create a new product for your inventory.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={() => navigate('/?tab=inventory')} disabled={submitting}>Back</button>
          </div>
        </div>

        {/* Admin seller picker */}
        {isAdmin && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Seller</label>
            <select
              value={selectedSellerId || ''}
              onChange={(e) => setSelectedSellerId(e.target.value || null)}
              className="w-full max-w-md text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {sellers.map(s => (
                <option key={s.uid} value={s.uid}>{s.name || s.email} ({s.uid})</option>
              ))}
            </select>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
              <input value={newItem.name} onChange={(e)=> setNewItem(s=> ({...s, name: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Alginate Powder" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <input value={newItem.sku} onChange={(e)=> setNewItem(s=> ({...s, sku: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. SKU-ALG-001" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={newItem.description} onChange={(e)=> setNewItem(s=> ({...s, description: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" rows={3} placeholder="Short product description" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product Image</label>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={handlePickImage} className="px-3 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200" disabled={!effectiveSellerId}>
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
                <select value={newItem.category} onChange={(e)=> setNewItem(s=> ({...s, category: e.target.value, subcategory: ''}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="">Select category...</option>
                  {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
                <select value={newItem.subcategory} onChange={(e)=> setNewItem(s=> ({...s, subcategory: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" disabled={!newItem.category}>
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
              <input type="number" value={newItem.price} onChange={(e)=> setNewItem(s=> ({...s, price: Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
              <div className="flex gap-2">
                <input type="number" value={newItem.weight} onChange={(e)=> setNewItem(s=> ({...s, weight: Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
                <select value={newItem.weightUnit} onChange={(e)=> setNewItem(s=> ({...s, weightUnit: e.target.value as any}))} className="min-w-[88px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input value={newItem.unit} onChange={(e)=> setNewItem(s=> ({...s, unit: e.target.value}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="pcs, box" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Length</label>
              <div className="flex gap-2">
                <input type="number" value={newItem.dimensions.length} onChange={(e)=> setNewItem(s=> ({ ...s, dimensions: { ...s.dimensions, length: Number(e.target.value) }}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
                <select value={newItem.dimensionUnit} onChange={(e)=> setNewItem(s=> ({...s, dimensionUnit: e.target.value as any}))} className="min-w-[88px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Width</label>
              <div className="flex gap-2">
                <input type="number" value={newItem.dimensions.width} onChange={(e)=> setNewItem(s=> ({ ...s, dimensions: { ...s.dimensions, width: Number(e.target.value) }}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
                <select value={newItem.dimensionUnit} onChange={(e)=> setNewItem(s=> ({...s, dimensionUnit: e.target.value as any}))} className="min-w-[88px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Height</label>
              <div className="flex gap-2">
                <input type="number" value={newItem.dimensions.height} onChange={(e)=> setNewItem(s=> ({ ...s, dimensions: { ...s.dimensions, height: Number(e.target.value) }}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
                <select value={newItem.dimensionUnit} onChange={(e)=> setNewItem(s=> ({...s, dimensionUnit: e.target.value as any}))} className="min-w-[88px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Suggested Threshold</label>
              <input type="number" value={newItem.suggestedThreshold} onChange={(e)=> setNewItem(s=> ({...s, suggestedThreshold: Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Initial Stock</label>
              <input type="number" value={newItem.inStock} onChange={(e)=> setNewItem(s=> ({...s, inStock: Number(e.target.value)}))} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="0" />
            </div>
            <div className="hidden md:block" />
          </div>

          {/* Price, Stock & Variants */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Price, Stock & Variants</h4>
                <p className="text-xs text-gray-500">Add variant rows to set per-variant price and stock.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50" onClick={addBlankVariant}>
                  + Add Variant
                </button>
              </div>
            </div>

            {/* Simple product row when no variants */}
            {variants.length === 0 && (
              <div className="border rounded overflow-hidden">
                <div className="grid grid-cols-7 text-xs bg-gray-50">
                  <div className="p-2 font-medium text-gray-600">Image</div>
                  <div className="p-2 font-medium text-gray-600">Name</div>
                  <div className="p-2 font-medium text-gray-600">Price</div>
                  <div className="p-2 font-medium text-gray-600">Special Price</div>
                  <div className="p-2 font-medium text-gray-600">Stock</div>
                  <div className="p-2 font-medium text-gray-600">SellerSKU</div>
                  <div className="p-2 font-medium text-gray-600">Availability</div>
                </div>
                <div className="grid grid-cols-7 items-center text-xs">
                  <div className="p-2">
                    <button type="button" className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50" onClick={handlePickImage} title="Choose product image" disabled={!effectiveSellerId}>
                      {(newItem.imagePreview || newItem.imageUrl) ? 'Replace Image' : 'Add Image'}
                    </button>
                    {(newItem.imagePreview || newItem.imageUrl) && (
                      <img src={newItem.imagePreview || newItem.imageUrl} alt="preview" className="inline-block ml-2 h-8 w-8 rounded object-cover border" />
                    )}
                  </div>
                  <div className="p-2"><input value={newItem.simpleVariantName || ''} onChange={(e)=> setNewItem(s=> ({...s, simpleVariantName: e.target.value}))} className="w-full p-1 border rounded" placeholder="e.g. default" /></div>
                  <div className="p-2"><input type="number" value={newItem.price} onChange={(e)=> setNewItem(s=> ({...s, price: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                  <div className="p-2"><input type="number" value={newItem.specialPrice} onChange={(e)=> setNewItem(s=> ({...s, specialPrice: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                  <div className="p-2"><input type="number" value={newItem.inStock} onChange={(e)=> setNewItem(s=> ({...s, inStock: Number(e.target.value)}))} className="w-full p-1 border rounded" /></div>
                  <div className="p-2"><input value={newItem.sku} onChange={(e)=> setNewItem(s=> ({...s, sku: e.target.value}))} className="w-full p-1 border rounded" /></div>
                  <div className="p-2"><input type="checkbox" className="accent-teal-600" checked={available} onChange={(e)=> setAvailable(e.target.checked)} /></div>
                </div>
              </div>
            )}

            {/* Variants grid */}
            {variants.length > 0 && (
              <div className="mt-4 overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-600">Image</th>
                      <th className="text-left p-2 font-medium text-gray-600">Name</th>
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
                          <input type="file" accept="image/*" ref={(el) => { variantFileInputs.current[v.key] = el; }} className="hidden" onChange={(e) => handleVariantFileChange(v.key, e)} />
                          <button type="button" className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={() => triggerVariantFilePick(v.key)} disabled={!effectiveSellerId}>
                            {v.imagePreview || v.imageUrl ? 'Replace' : 'Add'}
                          </button>
                          {(v.imagePreview || v.imageUrl) && (
                            <img src={v.imagePreview || v.imageUrl} alt="preview" className="inline-block ml-2 h-8 w-8 rounded object-cover border" />
                          )}
                        </td>
                        <td className="p-2"><input value={v.name || ''} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, name: e.target.value}:x))} className="w-full p-1 border rounded" placeholder={`Variant ${idx+1}`} /></td>
                        <td className="p-2"><input type="number" value={v.price} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, price: Number(e.target.value)}:x))} className="w-24 p-1 border rounded" /></td>
                        <td className="p-2"><input type="number" value={(v as any).specialPrice || 0} onChange={(e)=> setVariants((list)=> list.map((x)=> x.key===v.key?{...x, specialPrice: Number(e.target.value)}:x))} className="w-24 p-1 border rounded" /></td>
                        <td className="p-2"><input type="number" value={v.stock} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, stock: Number(e.target.value)}:x))} className="w-20 p-1 border rounded" /></td>
                        <td className="p-2"><input value={v.sku || ''} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, sku: e.target.value}:x))} className="w-32 p-1 border rounded" /></td>
                        <td className="p-2"><input type="checkbox" className="accent-teal-600" checked={(v as any).available ?? true} onChange={(e)=> setVariants((list)=> list.map(x=> x.key===v.key?{...x, available: e.target.checked}:x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800" onClick={() => navigate('/?tab=inventory')} disabled={submitting}>Cancel</button>
            <button className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40" onClick={() => handleCreateItem('draft')} disabled={submitting || !newItem.name.trim()} title="Save this product as a draft">
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40" onClick={handleCreateClick} disabled={submitting || !validation.isValid}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
