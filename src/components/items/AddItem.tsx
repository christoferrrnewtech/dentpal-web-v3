/**
 * AddItem - Add new product with variations
 * 
 * Allows sellers to add new products with:
 * - Basic information
 * - Category & classification
 * - Pricing
 * - Product variations
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ProductService } from '@/services/product';
import CategoryService from '@/services/category';
import { Package, X, Plus, FolderTree, Boxes, Trash2, ImageIcon, AlertTriangle, Save, Shield } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const AddItem: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ id: string; name: string }>>([]);

  const { uid, isSeller, isSubAccount, parentId } = useAuth();
  const { toast } = useToast();
  const effectiveSellerId = isSeller ? (isSubAccount ? (parentId || uid) : uid) : null;

  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryID: '',
    subCategoryID: '',
    price: 0,
    specialPrice: '' as number | '',
    inStock: 0,
    suggestedThreshold: 5,
    lowestPrice: '' as number | '',
    imageURL: '',
    imageFile: null as File | null,
    imagePreview: null as string | null,
    dangerousGoods: 'none' as 'none' | 'battery' | 'flammable' | 'liquid',
    warrantyType: '',
    warrantyDuration: '',
    variations: [] as Array<{
      name: string;
      SKU: string;
      price: number;
      stock: number;
      imageURL: string;
      imageFile?: File | null;
      imagePreview?: string | null;
      weight: number | '';
      weightUnit: string;
      dimensions: { length: number | ''; width: number | ''; height: number | '' };
      dimensionsUnit: string;
      isFragile?: boolean;
      isNew?: boolean;
    }>,
  });

  // Load categories
  useEffect(() => {
    const unsub = CategoryService.listenCategories((categories) => {
      const list = categories.map(cat => ({ id: cat.id, name: cat.name })).sort((a, b) => a.name.localeCompare(b.name));
      setCategoriesList(list);
    });
    return () => unsub();
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (form.categoryID) {
      const unsub = CategoryService.listenSubcategories(form.categoryID, setSubcategoryOptions);
      return () => unsub();
    } else {
      setSubcategoryOptions([]);
    }
  }, [form.categoryID]);

  const handleSave = async () => {
    if (!effectiveSellerId) {
      toast({ title: 'Error', description: 'No seller ID found', variant: 'destructive' });
      return;
    }

    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'Product name is required', variant: 'destructive' });
      return;
    }

    if (!form.categoryID) {
      toast({ title: 'Error', description: 'Category is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // Upload main product image if exists
      let imageURL = form.imageURL;
      if (form.imageFile) {
        const imgRef = storageRef(storage, `products/${effectiveSellerId}/${Date.now()}_${form.imageFile.name}`);
        await uploadBytes(imgRef, form.imageFile);
        imageURL = await getDownloadURL(imgRef);
      }

      // Create product - Always set to pending_qc for admin approval
      const productData = {
        sellerId: effectiveSellerId,
        name: form.name,
        description: form.description,
        categoryID: form.categoryID,
        subCategoryID: form.subCategoryID || '',
        imageURL: imageURL,
        status: 'pending_qc' as const, // Always pending QC first
        suggestedThreshold: form.suggestedThreshold,
        price: form.price || 0,
        specialPrice: form.specialPrice || null,
        inStock: form.inStock || 0,
        lowestPrice: form.lowestPrice || form.price || null,
        // Map specific dangerous goods types to 'dangerous' for Firebase
        dangerousGoods: (form.dangerousGoods === 'none' ? 'none' : 'dangerous') as 'none' | 'dangerous',
        warrantyType: form.warrantyType || null,
        warrantyDuration: form.warrantyDuration || null,
      };

      const result = await ProductService.createProduct(productData);
      const productId = result.id;

      // Add variations if any
      if (form.variations.length > 0) {
        const variationsData = await Promise.all(
          form.variations.map(async (variation) => {
            if (!variation.name || !variation.SKU) return null;

            let varImageURL = variation.imageURL;
            if (variation.imageFile) {
              const varImgRef = storageRef(storage, `products/${effectiveSellerId}/variations/${Date.now()}_${variation.imageFile.name}`);
              await uploadBytes(varImgRef, variation.imageFile);
              varImageURL = await getDownloadURL(varImgRef);
            }

            return {
              name: variation.name,
              sku: variation.SKU,
              price: variation.price,
              stock: variation.stock,
              imageURL: varImageURL,
              weight: variation.weight || null,
              weightUnit: variation.weightUnit,
              dimensions: {
                length: variation.dimensions.length || null,
                width: variation.dimensions.width || null,
                height: variation.dimensions.height || null,
              },
              dimensionsUnit: variation.dimensionsUnit,
              isFragile: variation.isFragile || false,
            };
          })
        );

        const validVariations = variationsData.filter(v => v !== null);
        if (validVariations.length > 0) {
          await ProductService.addVariations(productId, validVariations);
        }
      }

      toast({ 
        title: 'Success', 
        description: 'Product submitted for admin approval. It will appear in Pending QC.' 
      });
      
      // Reset form
      setForm({
        name: '',
        description: '',
        categoryID: '',
        subCategoryID: '',
        price: 0,
        specialPrice: '',
        inStock: 0,
        suggestedThreshold: 5,
        lowestPrice: '',
        imageURL: '',
        imageFile: null,
        imagePreview: null,
        dangerousGoods: 'none',
        warrantyType: '',
        warrantyDuration: '',
        variations: [],
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add product', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-xl">
        <h2 className="text-2xl font-bold text-white">Add New Product</h2>
      </div>

        <input
          ref={productImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const preview = URL.createObjectURL(file);
              setForm(prev => ({
                ...prev,
                imageFile: file,
                imagePreview: preview
              }));
            }
          }}
        />

        {/* Body */}
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter product description"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div className="flex items-center gap-4">
                  {(form.imagePreview || form.imageURL) && (
                    <img
                      src={form.imagePreview || form.imageURL}
                      alt="Product"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => productImageInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    {form.imageURL ? 'Change Image' : 'Upload Image'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Category & Classification Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-teal-600" />
              Category & Classification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={form.categoryID}
                  onChange={(e) => {
                    setForm({...form, categoryID: e.target.value, subCategoryID: ''});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                <select
                  value={form.subCategoryID}
                  onChange={(e) => setForm({...form, subCategoryID: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={!form.categoryID}
                >
                  <option value="">Select subcategory</option>
                  {subcategoryOptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({...form, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.specialPrice}
                  onChange={(e) => setForm({...form, specialPrice: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                <input
                  type="number"
                  value={form.inStock}
                  onChange={(e) => setForm({...form, inStock: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Threshold</label>
                <input
                  type="number"
                  value={form.suggestedThreshold}
                  onChange={(e) => setForm({...form, suggestedThreshold: parseInt(e.target.value) || 5})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Product Variations Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                Product Variations
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {form.variations.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    ...form,
                    variations: [
                      ...form.variations,
                      {
                        name: '',
                        SKU: '',
                        price: 0,
                        stock: 0,
                        imageURL: '',
                        imageFile: null,
                        imagePreview: null,
                        weight: '',
                        weightUnit: 'kg',
                        dimensions: { length: '', width: '', height: '' },
                        dimensionsUnit: 'cm',
                        isFragile: false,
                        isNew: true
                      }
                    ]
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Variation
              </button>
            </div>

            {form.variations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Boxes className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No variations added yet. Click "Add Variation" to create one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.variations.map((variation, index) => (
                  <div key={index} className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-700">Variation {index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedVariations = [...form.variations];
                          updatedVariations.splice(index, 1);
                          setForm({ ...form, variations: updatedVariations });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Variation Image */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Variation Image</label>
                        <div className="flex items-center gap-4">
                          {(variation.imagePreview || variation.imageURL) && (
                            <div className="relative group">
                              <img
                                src={variation.imagePreview || variation.imageURL}
                                alt={`Variation ${index + 1}`}
                                className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            id={`variation-image-${index}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const preview = URL.createObjectURL(file);
                                const updatedVariations = [...form.variations];
                                updatedVariations[index] = {
                                  ...variation,
                                  imageFile: file,
                                  imagePreview: preview
                                };
                                setForm({ ...form, variations: updatedVariations });
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`variation-image-${index}`)?.click()}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                          >
                            {variation.imageURL ? 'Change Image' : 'Upload Image'}
                          </button>
                        </div>
                      </div>

                      {/* Variation Name */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Variation Name *</label>
                        <input
                          type="text"
                          value={variation.name}
                          onChange={(e) => {
                            const updatedVariations = [...form.variations];
                            updatedVariations[index] = { ...variation, name: e.target.value };
                            setForm({ ...form, variations: updatedVariations });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Small, Medium, Large"
                        />
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                        <input
                          type="text"
                          value={variation.SKU}
                          onChange={(e) => {
                            const updatedVariations = [...form.variations];
                            updatedVariations[index] = { ...variation, SKU: e.target.value };
                            setForm({ ...form, variations: updatedVariations });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., PROD-VAR-001"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={variation.price}
                          onChange={(e) => {
                            const updatedVariations = [...form.variations];
                            updatedVariations[index] = { ...variation, price: parseFloat(e.target.value) || 0 };
                            setForm({ ...form, variations: updatedVariations });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Stock */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                        <input
                          type="number"
                          value={variation.stock}
                          onChange={(e) => {
                            const updatedVariations = [...form.variations];
                            updatedVariations[index] = { ...variation, stock: parseInt(e.target.value) || 0 };
                            setForm({ ...form, variations: updatedVariations });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>

                      {/* Weight */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={variation.weight}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = { ...variation, weight: e.target.value === '' ? '' : parseFloat(e.target.value) };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                          <select
                            value={variation.weightUnit}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = { ...variation, weightUnit: e.target.value };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="lb">lb</option>
                            <option value="oz">oz</option>
                          </select>
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (L × W × H)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={variation.dimensions.length}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = {
                                ...variation,
                                dimensions: { ...variation.dimensions, length: e.target.value === '' ? '' : parseFloat(e.target.value) }
                              };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Length"
                          />
                          <span className="text-gray-400 flex items-center">×</span>
                          <input
                            type="number"
                            step="0.01"
                            value={variation.dimensions.width}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = {
                                ...variation,
                                dimensions: { ...variation.dimensions, width: e.target.value === '' ? '' : parseFloat(e.target.value) }
                              };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Width"
                          />
                          <span className="text-gray-400 flex items-center">×</span>
                          <input
                            type="number"
                            step="0.01"
                            value={variation.dimensions.height}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = {
                                ...variation,
                                dimensions: { ...variation.dimensions, height: e.target.value === '' ? '' : parseFloat(e.target.value) }
                              };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Height"
                          />
                          <select
                            value={variation.dimensionsUnit}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = { ...variation, dimensionsUnit: e.target.value };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="in">in</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>
                      </div>

                      {/* Fragile Checkbox */}
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={variation.isFragile || false}
                            onChange={(e) => {
                              const updatedVariations = [...form.variations];
                              updatedVariations[index] = { ...variation, isFragile: e.target.checked };
                              setForm({ ...form, variations: updatedVariations });
                            }}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <AlertTriangle className={`w-4 h-4 ${variation.isFragile ? 'text-orange-500' : 'text-gray-400'}`} />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            Mark as fragile (requires special handling)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warranty & Compliance Section */}
          <div className="bg-amber-50 rounded-xl p-5 border-2 border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Warranty & Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dangerous Goods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dangerous Goods</label>
                <select
                  value={form.dangerousGoods}
                  onChange={(e) => setForm({...form, dangerousGoods: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="none">None</option>
                  <option value="battery">Contains Battery</option>
                  <option value="flammable">Flammable</option>
                  <option value="liquid">Liquid</option>
                </select>
              </div>

              {/* Warranty Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Type</label>
                <select
                  value={form.warrantyType}
                  onChange={(e) => setForm({...form, warrantyType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select warranty type</option>
                  <option value="local_manufacturer">Local Manufacturer Warranty</option>
                  <option value="international_manufacturer">International Manufacturer Warranty</option>
                  <option value="local_supplier">Local Supplier Warranty</option>
                  <option value="local_supplier_refund">Local Supplier Refund Warranty</option>
                  <option value="no_warranty">No Warranty</option>
                  <option value="international_seller">International Seller Warranty</option>
                </select>
              </div>

              {/* Warranty Duration */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.warrantyDuration.split(' ')[0] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const unit = form.warrantyDuration.split(' ')[1] || 'month';
                      setForm({...form, warrantyDuration: value ? `${value} ${unit}` : ''});
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter duration"
                  />
                  <select
                    value={form.warrantyDuration.split(' ')[1] || 'month'}
                    onChange={(e) => {
                      const value = form.warrantyDuration.split(' ')[0] || '';
                      setForm({...form, warrantyDuration: value ? `${value} ${e.target.value}` : ''});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-200 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            onClick={() => setForm({
              name: '',
              description: '',
              categoryID: '',
              subCategoryID: '',
              price: 0,
              specialPrice: '',
              inStock: 0,
              suggestedThreshold: 5,
              lowestPrice: '',
              imageURL: '',
              imageFile: null,
              imagePreview: null,
              dangerousGoods: 'none',
              warrantyType: '',
              warrantyDuration: '',
              variations: [],
            })}
            disabled={submitting}
            className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !form.name || !form.categoryID}
            className="px-5 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Add Product
              </>
            )}
          </button>
        </div>
    </div>
  );
};

export default AddItem;
