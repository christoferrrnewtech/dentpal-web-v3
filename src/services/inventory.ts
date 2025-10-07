import { db, auth } from '../lib/firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  // orderBy,  // removed to avoid requiring composite index
  query,
  serverTimestamp,
  updateDoc,
  where,
  increment,
  getDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';

// Firestore collection names
const ITEMS_COLLECTION = 'inventory_items';
const ADJUSTMENTS_COLLECTION = 'inventory_adjustments';
const PRODUCT_COLLECTION = 'Product'; // New: for syncing active status

export type CreateItemInput = {
  sellerId: string;
  name: string;
  suggestedThreshold: number;
  unit?: string;
  inStock?: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  subcategory?: string;
  variations?: string[];
  price?: number;
  // Added: top-level special price for simple products
  specialPrice?: number;
  sku?: string;
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  // variants
  hasVariants?: boolean;
  variantOptions?: string[]; // kept for compatibility though UI no longer uses it
  variants?: Array<{ key: string; options: Record<string, string>; price: number; stock: number; sku?: string; specialPrice?: number; available?: boolean; imageUrl?: string }>;
  // availability
  available?: boolean;
  preOrder?: boolean;
  // New: initial status (defaults to 'active' if not provided)
  status?: 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
  // New: promotion schedule (optional)
  promoStart?: number | null;
  promoEnd?: number | null;
  // New: link to Product doc
  productId?: string;
};

export type UpdateItemInput = Partial<CreateItemInput> & {
  status?: 'active' | 'inactive' | 'draft' | 'pending_qc' | 'violation' | 'deleted';
};

export const InventoryService = {
  listenBySeller(sellerId: string, cb: (rows: any[]) => void) {
    const q = query(
      collection(db, ITEMS_COLLECTION),
      where('sellerId', '==', sellerId)
      // removed orderBy('name','asc') to avoid index requirement
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          suggestedThreshold: Number(data.suggestedThreshold ?? 0),
          inStock: Number(data.inStock ?? 0),
          unit: data.unit ?? undefined,
          updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
          // Catalog fields
          description: data.description ?? '',
          imageUrl: data.imageUrl ?? undefined,
          category: data.category ?? undefined,
          subcategory: data.subcategory ?? undefined,
          variations: Array.isArray(data.variations) ? data.variations : [],
          price: data.price != null ? Number(data.price) : undefined,
          // Added: propagate top-level special price
          specialPrice: data.specialPrice != null ? Number(data.specialPrice) : undefined,
          // Added: status
          status: data.status || 'active',
          sku: data.sku ?? undefined,
          weight: data.weight != null ? Number(data.weight) : undefined,
          dimensions: data.dimensions || undefined,
          // availability
          available: data.available ?? true,
          preOrder: data.preOrder ?? false,
          // variants
          hasVariants: !!data.hasVariants,
          variants: Array.isArray(data.variants) ? data.variants : undefined,
          // promotion schedule
          promoStart: data.promoStart ?? null,
          promoEnd: data.promoEnd ?? null,
          // product link
          productId: data.productId ?? undefined,
        };
      });
      // Client-side sort by name asc
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cb(rows);
    });
    return unsub;
  },

  async createItem(input: CreateItemInput) {
    const payload: any = {
      sellerId: input.sellerId,
      name: input.name,
      suggestedThreshold: Number(input.suggestedThreshold ?? 0),
      inStock: Number(input.inStock ?? 0),
      unit: input.unit ?? null,
      // Catalog fields
      description: input.description ?? '',
      imageUrl: input.imageUrl ?? null,
      category: input.category ?? null,
      subcategory: input.subcategory ?? null,
      variations: input.variations ?? [],
      price: input.price != null ? Number(input.price) : null,
      // Added: persist top-level special price
      specialPrice: input.specialPrice != null ? Number(input.specialPrice) : null,
      // Updated: allow overriding initial status (default 'active')
      status: input.status ?? 'active',
      sku: input.sku ?? null,
      weight: input.weight != null ? Number(input.weight) : null,
      dimensions: input.dimensions ?? null,
      // availability
      available: input.available ?? true,
      preOrder: input.preOrder ?? false,
      // promotion schedule
      promoStart: input.promoStart ?? null,
      promoEnd: input.promoEnd ?? null,
      // product link
      productId: input.productId ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid ?? null,
    };

    if (input.hasVariants) {
      payload.hasVariants = true;
      payload.variants = (input.variants || []).map(v => ({
        key: v.key,
        options: v.options,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        sku: v.sku || null,
        specialPrice: v.specialPrice != null ? Number(v.specialPrice) : null,
        available: v.available ?? true,
        imageUrl: v.imageUrl || null,
      }));
      // Optionally compute inStock as sum of variant stock
      payload.inStock = (payload.variants as any[]).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }

    const ref = await addDoc(collection(db, ITEMS_COLLECTION), payload);

    // New: if initial stock is provided, write an initial adjustment entry
    const initial = Number(payload.inStock || 0);
    if (initial > 0) {
      await addDoc(collection(db, ADJUSTMENTS_COLLECTION), {
        itemId: ref.id,
        sellerId: input.sellerId,
        itemName: input.name,
        delta: initial,
        reason: 'Initial Stock',
        stockBefore: 0,
        stockAfter: initial,
        userId: auth.currentUser?.uid ?? null,
        at: serverTimestamp(),
      });
    }

    return { id: ref.id };
  },

  async adjustStock(itemId: string, delta: number, reason: string) {
    const ref = doc(db, ITEMS_COLLECTION, itemId);

    // Prepare adjustment log
    const itemSnap = await getDoc(ref);
    const itemData: any = itemSnap.data() || {};
    const before = Number(itemData?.inStock ?? 0);
    const after = before + Number(delta);

    await updateDoc(ref, {
      inStock: increment(Number(delta)),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? null,
      lastAdjustmentReason: reason,
      lastAdjustmentDelta: Number(delta),
    });

    await addDoc(collection(db, ADJUSTMENTS_COLLECTION), {
      itemId,
      // New: add seller and item denorm fields for easier history queries
      sellerId: itemData?.sellerId ?? null,
      itemName: itemData?.name ?? null,
      delta: Number(delta),
      reason,
      stockBefore: before,
      stockAfter: after,
      userId: auth.currentUser?.uid ?? null,
      at: serverTimestamp(),
    });
  },

  async toggleActive(itemId: string, nextActive: boolean) {
    const ref = doc(db, ITEMS_COLLECTION, itemId);
    // Read item to get productId (if any)
    const snap = await getDoc(ref);
    const data: any = snap.data() || {};

    await updateDoc(ref, {
      status: nextActive ? 'active' : 'inactive',
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? null,
    });

    // Also sync to Product.isActive if linked
    let productId: string | undefined = data?.productId || undefined;
    if (productId) {
      const pRef = doc(db, PRODUCT_COLLECTION, productId);
      await updateDoc(pRef, {
        isActive: !!nextActive,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    // Fallback: try to find Product by sellerId + name and update it
    try {
      const sellerId = data?.sellerId || null;
      const name = data?.name || null;
      if (sellerId && name) {
        const prodQ = query(collection(db, PRODUCT_COLLECTION), where('sellerId', '==', sellerId), where('name', '==', name));
        const prodSnap = await getDocs(prodQ);
        const match = prodSnap.docs[0];
        if (match) {
          const pRef = doc(db, PRODUCT_COLLECTION, match.id);
          await updateDoc(pRef, {
            isActive: !!nextActive,
            updatedAt: serverTimestamp(),
          });
          // Backfill link for future syncs
          await updateDoc(ref, { productId: match.id, updatedAt: serverTimestamp() });
        }
      }
    } catch (e) {
      // non-fatal if product not found; inventory status already updated
      console.warn('toggleActive: product sync fallback failed', e);
    }
  },

  // New: listen to adjustments for a seller (used by History tab)
  listenAdjustmentsBySeller(sellerId: string, cb: (rows: any[]) => void) {
    const q = query(
      collection(db, ADJUSTMENTS_COLLECTION),
      where('sellerId', '==', sellerId)
      // no orderBy to avoid composite index; sort client-side
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data: any = d.data();
        const at = data.at?.toMillis?.() ?? Date.now();
        return {
          id: d.id,
          adjustmentNo: `ADJ-${d.id.slice(-4).toUpperCase()}`,
          dateISO: new Date(at).toISOString().slice(0, 10),
          reason: data.reason ?? '',
          itemName: data.itemName ?? '',
          stockAfter: Number(data.stockAfter ?? 0),
          raw: data,
        };
      });
      // sort newest first
      rows.sort((a, b) => (b.raw.at?.toMillis?.() ?? 0) - (a.raw.at?.toMillis?.() ?? 0));
      cb(rows);
    });
    return unsub;
  },

  async getItemById(itemId: string) {
    const ref = doc(db, ITEMS_COLLECTION, itemId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
  },

  async updateItem(itemId: string, input: UpdateItemInput) {
    const ref = doc(db, ITEMS_COLLECTION, itemId);
    const payload: any = {
      // only include fields that are defined in input
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
      ...(input.variations !== undefined ? { variations: input.variations } : {}),
      ...(input.price !== undefined ? { price: input.price != null ? Number(input.price) : null } : {}),
      ...(input.specialPrice !== undefined ? { specialPrice: input.specialPrice != null ? Number(input.specialPrice) : null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.weight !== undefined ? { weight: input.weight != null ? Number(input.weight) : null } : {}),
      ...(input.dimensions !== undefined ? { dimensions: input.dimensions ?? null } : {}),
      ...(input.available !== undefined ? { available: input.available } : {}),
      ...(input.preOrder !== undefined ? { preOrder: input.preOrder } : {}),
      ...(input.suggestedThreshold !== undefined ? { suggestedThreshold: Number(input.suggestedThreshold ?? 0) } : {}),
      ...(input.unit !== undefined ? { unit: input.unit ?? null } : {}),
      ...(input.inStock !== undefined ? { inStock: Number(input.inStock ?? 0) } : {}),
      ...(input.hasVariants !== undefined ? { hasVariants: !!input.hasVariants } : {}),
      ...(input.variants !== undefined ? { variants: (input.variants || []).map(v => ({
        key: v.key,
        options: v.options,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        sku: v.sku || null,
        specialPrice: v.specialPrice != null ? Number(v.specialPrice) : null,
        available: v.available ?? true,
        imageUrl: v.imageUrl || null,
      })) } : {}),
      ...(input.promoStart !== undefined ? { promoStart: input.promoStart ?? null } : {}),
      ...(input.promoEnd !== undefined ? { promoEnd: input.promoEnd ?? null } : {}),
      ...(input.productId !== undefined ? { productId: input.productId ?? null } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? null,
    };

    // If variants provided, recompute inStock as sum
    if (input.variants) {
      payload.inStock = (payload.variants as any[]).reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    }

    await updateDoc(ref, payload);
  },
};
