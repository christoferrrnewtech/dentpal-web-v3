import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type CreateProductInput = {
  sellerId: string;
  name: string;
  description?: string;
  imageURL?: string;
  imageVersion?: string | null;
  categoryID?: string | null;
  subCategoryID?: string | null;
  isActive?: boolean;
  clickCounter?: number;
  lowestPrice?: number | null;
  variationImageVersions?: Record<string, string> | null;
};

const PRODUCT_COLLECTION = 'Product';

export const ProductService = {
  async createProduct(input: CreateProductInput) {
    const payload = {
      sellerId: input.sellerId,
      name: input.name,
      description: input.description ?? '',
      imageURL: input.imageURL ?? '',
      imageVersion: input.imageVersion ?? null,
      categoryID: input.categoryID ?? null,
      subCategoryID: input.subCategoryID ?? null,
      isActive: input.isActive ?? true,
      clickCounter: input.clickCounter ?? 0,
      lowestPrice: input.lowestPrice ?? null,
      variationImageVersions: input.variationImageVersions ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as const;

    const ref = await addDoc(collection(db, PRODUCT_COLLECTION), payload as any);
    return { id: ref.id };
  },

  async addVariations(productId: string, variations: Array<{
    sku?: string;
    price?: number;
    stock?: number;
    weight?: number;
    dimensions?: { length?: number; width?: number; height?: number } | null;
    imageURL?: string | null;
    name?: string;
  }>) {
    const col = collection(db, PRODUCT_COLLECTION, productId, 'Variation');
    const tasks = variations.map(v => addDoc(col, {
      sku: v.sku ?? null,
      SKU: v.sku ?? null,
      price: v.price != null ? Number(v.price) : null,
      stock: v.stock != null ? Number(v.stock) : 0,
      weight: v.weight != null ? Number(v.weight) : null,
      dimensions: v.dimensions ?? null,
      imageURL: v.imageURL ?? null,
      name: v.name ?? null,
      productId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    await Promise.all(tasks);
  },
};

export default ProductService;
