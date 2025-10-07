import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, updateDoc, doc, getDocs, getDoc } from 'firebase/firestore';

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
      // Write both spellings to satisfy consumers and requested schema
      subCategoryID: input.subCategoryID ?? null,
      subcategoryID: input.subCategoryID ?? null,
      isActive: input.isActive ?? true,
      clickCounter: input.clickCounter ?? 0,
      lowestPrice: input.lowestPrice ?? null,
      variationImageVersions: input.variationImageVersions ?? null,
      // New: status and product-level pricing fields
      status: 'active',
      price: null,
      specialPrice: null,
      promoStart: null,
      promoEnd: null,
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
    const tasks = variations.map(v => {
      const dim = v.dimensions || null;
      return addDoc(col, {
        // Required fields per request
        SKU: v.sku ?? null,
        // Also keep lowercase for compatibility
        sku: v.sku ?? null,
        price: v.price != null ? Number(v.price) : null,
        stock: v.stock != null ? Number(v.stock) : 0,
        weight: v.weight != null ? Number(v.weight) : null,
        // New: singular `dimension` object with height, width, weight
        dimension: {
          height: dim?.height ?? null,
          width: dim?.width ?? null,
          // Note: request included weight inside dimension as well
          weight: v.weight != null ? Number(v.weight) : null,
        },
        // Keep legacy `dimensions` for backward compatibility
        dimensions: dim ?? null,
        imageURL: v.imageURL ?? null,
        name: v.name ?? null,
        productId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await Promise.all(tasks);
  },

  // Fetch variations for a product
  async getVariations(productId: string) {
    const varSnap = await getDocs(collection(db, PRODUCT_COLLECTION, productId, 'Variation'));
    return varSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  },

  // Convenience: fetch product with variations
  async getProductDetail(productId: string) {
    const prod = await this.getProductById(productId);
    if (!prod) return null;
    const vars = await this.getVariations(productId);
    return { product: prod, variations: vars };
  },

  // New: Toggle product active flag
  async toggleActive(productId: string, nextActive: boolean) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, { isActive: !!nextActive, status: nextActive ? 'active' : 'inactive', updatedAt: serverTimestamp() });
  },

  // New: Listen to products by seller and aggregate basic inventory fields
  listenBySeller(
    sellerId: string,
    cb: (rows: Array<{
      id: string;
      name: string;
      imageUrl?: string;
      price?: number;
      specialPrice?: number;
      inStock: number;
      status: 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
      updatedAt: number;
      sku?: string;
      category?: string;
      subcategory?: string;
    }>) => void
  ) {
    const qRef = query(collection(db, PRODUCT_COLLECTION), where('sellerId', '==', sellerId));
    const unsub = onSnapshot(qRef, async (snap) => {
      const products = await Promise.all(snap.docs.map(async (d) => {
        const pd: any = d.data();
        // Sum variation stocks
        let totalStock = 0;
        let derivedPrice: number | undefined = pd.lowestPrice != null ? Number(pd.lowestPrice) : undefined;
        try {
          const varSnap = await getDocs(collection(db, PRODUCT_COLLECTION, d.id, 'Variation'));
          const vars = varSnap.docs.map(vd => vd.data() as any);
          totalStock = vars.reduce((sum, v) => sum + (Number(v.stock ?? 0)), 0);
          if (derivedPrice == null && vars.length > 0) {
            const minVarPrice = Math.min(...vars.map(v => Number(v.price ?? 0) || 0));
            derivedPrice = isFinite(minVarPrice) ? Number(minVarPrice) : undefined;
          }
        } catch {}
        // Effective special price: only expose when within schedule or long-term
        let effectiveSpecial: number | undefined = undefined;
        const now = Date.now();
        const hasLongTerm = pd.specialPrice != null && (pd.promoStart == null && pd.promoEnd == null);
        const inWindow = pd.specialPrice != null && pd.promoStart != null && pd.promoEnd != null && now >= Number(pd.promoStart) && now <= Number(pd.promoEnd);
        if (hasLongTerm || inWindow) {
          effectiveSpecial = Number(pd.specialPrice);
        }
        // Prefer explicit status if present, else derive from isActive
        const s = (pd.status ?? (pd.isActive === false ? 'inactive' : 'active')) as 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
        return {
          id: String(d.id),
          name: String(pd.name ?? ''),
          imageUrl: pd.imageURL ? String(pd.imageURL) : undefined,
          price: derivedPrice != null ? derivedPrice : (pd.price != null ? Number(pd.price) : undefined),
          specialPrice: effectiveSpecial,
          inStock: Number(totalStock || 0),
          status: s,
          updatedAt: pd.updatedAt?.toMillis?.() ? Number(pd.updatedAt.toMillis()) : Date.now(),
          sku: undefined as string | undefined,
          category: undefined as string | undefined,
          subcategory: undefined as string | undefined,
        };
      }));
      // sort name asc like before
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cb(products);
    });
    return unsub;
  },

  async updateProduct(productId: string, updates: Partial<{
    name: string;
    description: string;
    imageURL: string;
    categoryID: string | null;
    subCategoryID: string | null;
    isActive: boolean;
    lowestPrice: number | null;
    status: 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
  }>) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    const payload: any = {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.imageURL !== undefined ? { imageURL: updates.imageURL } : {}),
      ...(updates.categoryID !== undefined ? { categoryID: updates.categoryID } : {}),
      ...(updates.subCategoryID !== undefined ? { subCategoryID: updates.subCategoryID, subcategoryID: updates.subCategoryID } : {}),
      ...(updates.isActive !== undefined ? { isActive: !!updates.isActive } : {}),
      ...(updates.lowestPrice !== undefined ? { lowestPrice: updates.lowestPrice } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(pRef, payload);
  },

  // New helper: update product-level price, special price and promo window
  async updatePriceAndPromo(productId: string, payload: { price: number | null; specialPrice: number | null; promoStart: number | null; promoEnd: number | null; }) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    // Decide lowestPrice to aid list display
    const lowest = [payload.price, payload.specialPrice].filter((x) => x != null).map(Number);
    const nextLowest = lowest.length ? Math.min(...lowest) : null;
    await updateDoc(pRef, {
      price: payload.price ?? null,
      specialPrice: payload.specialPrice ?? null,
      promoStart: payload.promoStart ?? null,
      promoEnd: payload.promoEnd ?? null,
      lowestPrice: nextLowest,
      updatedAt: serverTimestamp(),
    });
  },

  // New: Soft delete a product (move to Deleted tab)
  async markDeleted(productId: string) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, { status: 'deleted', isActive: false, updatedAt: serverTimestamp() });
  },

  // New: Restore a deleted product (return as inactive by default)
  async restore(productId: string) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, { status: 'inactive', isActive: false, updatedAt: serverTimestamp() });
  },

  async getProductById(productId: string) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
  },
};

export default ProductService;
