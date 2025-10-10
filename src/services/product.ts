import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, updateDoc, doc, getDocs, getDoc, orderBy, increment } from 'firebase/firestore';

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
  // New: optional status override for creation (e.g., 'draft')
  status?: 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
  // New: suggested threshold for low-stock alerts
  suggestedThreshold?: number | null;
};

const PRODUCT_COLLECTION = 'Product';

export const ProductService = {
  async createProduct(input: CreateProductInput) {
    const initialStatus = input.status ?? 'pending_qc';
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
      // QC-first: new products are pending review by default unless overridden
      isActive: false,
      status: initialStatus,
      // Explicit approval flag
      IsApproved: false,
      clickCounter: input.clickCounter ?? 0,
      lowestPrice: input.lowestPrice ?? null,
      variationImageVersions: input.variationImageVersions ?? null,
      // product-level pricing fields
      price: null,
      specialPrice: null,
      promoStart: null,
      promoEnd: null,
      // New: low-stock threshold (optional)
      suggestedThreshold: input.suggestedThreshold ?? null,
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

  // Admin QC: approve -> active
  async approveProduct(productId: string) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, {
      status: 'active',
      isActive: true,
      // Mark as approved
      IsApproved: true,
      qcReviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // Admin QC: reject -> violation (keep inactive)
  async rejectProduct(productId: string, reason: string) {
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, {
      status: 'violation',
      isActive: false,
      // Keep unapproved
      IsApproved: false,
      qcRejectedAt: serverTimestamp(),
      qcReason: reason ?? '',
      updatedAt: serverTimestamp(),
    });
  },

  // Record a QC audit entry with a snapshot of product at action time
  async addQCAudit(productId: string, entry: { action: 'approve' | 'reject' | 'violation'; at?: number; reason?: string; adminId?: string | null; }) {
    try {
      const pRef = doc(db, PRODUCT_COLLECTION, productId);
      const snap = await getDoc(pRef);
      const productSnapshot = snap.exists() ? snap.data() : null;
      const payload = {
        productId,
        action: entry.action,
        reason: entry.reason ?? '',
        adminId: entry.adminId ?? null,
        at: entry.at ?? Date.now(),
        createdAt: serverTimestamp(),
        // store a lightweight copy of product for audit purposes
        productSnapshot,
        productSnapshotId: productId,
      } as const;
      await addDoc(collection(db, 'Product_QC_Audit'), payload as any);
    } catch (e) {
      console.error('addQCAudit failed', e);
    }
  },

  // Admin QC: listen to products needing QC (pending or not approved yet)
  listenPendingQC(cb: (rows: Array<{ id: string; data: any }>) => void) {
    // Broad query; filter client-side so older items (without the flag) are included
    const qRef = query(collection(db, PRODUCT_COLLECTION));
    const unsub = onSnapshot(qRef, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .filter(({ data }) => {
          const status = data.status || 'inactive';
          // Backward compatibility: treat QCProduct true as approved as well
          const approved = data.IsApproved === true || data.QCProduct === true;
          const excluded = status === 'deleted' || status === 'violation';
          return !excluded && !approved; // include anything not approved yet
        })
        .sort((a, b) => {
          const aTs = a.data.createdAt?.toMillis?.() ? Number(a.data.createdAt.toMillis()) : 0;
          const bTs = b.data.createdAt?.toMillis?.() ? Number(b.data.createdAt.toMillis()) : 0;
          return bTs - aTs;
        });
      cb(rows);
    });
    return unsub;
  },

  // Admin QC: listen to approved products
  listenApproved(cb: (rows: Array<{ id: string; data: any }>) => void) {
    const qRef = query(collection(db, PRODUCT_COLLECTION), where('IsApproved', '==', true));
    const unsub = onSnapshot(qRef, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .sort((a, b) => {
          const aTs = a.data.updatedAt?.toMillis?.() ? Number(a.data.updatedAt.toMillis()) : 0;
          const bTs = b.data.updatedAt?.toMillis?.() ? Number(b.data.updatedAt.toMillis()) : 0;
          return bTs - aTs;
        });
      cb(rows);
    });
    return unsub;
  },

  // Admin QC: listen to violation products
  listenViolation(cb: (rows: Array<{ id: string; data: any }>) => void) {
    const qRef = query(collection(db, PRODUCT_COLLECTION), where('status', '==', 'violation'));
    const unsub = onSnapshot(qRef, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .sort((a, b) => {
          const aTs = a.data.updatedAt?.toMillis?.() ? Number(a.data.updatedAt.toMillis()) : 0;
          const bTs = b.data.updatedAt?.toMillis?.() ? Number(b.data.updatedAt.toMillis()) : 0;
          return bTs - aTs;
        });
      cb(rows);
    });
    return unsub;
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
      qcReason?: string;
      // New: expose threshold
      suggestedThreshold?: number | null;
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
          qcReason: typeof pd.qcReason === 'string' ? pd.qcReason : undefined,
          suggestedThreshold: pd.suggestedThreshold != null ? Number(pd.suggestedThreshold) : null,
        };
      }));
      // sort name asc like before
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cb(products);
    });
    return unsub;
  },

  // New: Adjust stock for a specific variation
  async adjustVariationStock(productId: string, variationId: string, delta: number) {
    const vRef = doc(db, PRODUCT_COLLECTION, productId, 'Variation', variationId);
    await updateDoc(vRef, { stock: increment(Number(delta) || 0), updatedAt: serverTimestamp() });
    // Nudge parent product so product snapshot listeners refresh totals
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, { updatedAt: serverTimestamp() });
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
    suggestedThreshold: number | null;
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
      ...(updates.suggestedThreshold !== undefined ? { suggestedThreshold: updates.suggestedThreshold } : {}),
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

  // New: Ensure a default variation exists for a product, create one if missing
  async ensureDefaultVariation(productId: string) {
    // Reuse getVariations to check existing
    const existing = await this.getVariations(productId);
    if (existing.length > 0) return existing[0].id;

    const vCol = collection(db, PRODUCT_COLLECTION, productId, 'Variation');
    const ref = await addDoc(vCol, {
      SKU: null,
      sku: null,
      name: 'default',
      price: null,
      stock: 0,
      weight: null,
      dimension: { height: null, width: null, weight: null },
      dimensions: null,
      imageURL: null,
      productId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any);
    // Touch parent product so listeners recalc totals
    const pRef = doc(db, PRODUCT_COLLECTION, productId);
    await updateDoc(pRef, { updatedAt: serverTimestamp() });
    return ref.id;
  },
};

export default ProductService;
