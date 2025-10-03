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
} from 'firebase/firestore';

// Firestore collection names
const ITEMS_COLLECTION = 'inventory_items';
const ADJUSTMENTS_COLLECTION = 'inventory_adjustments';

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
          sku: data.sku ?? undefined,
          weight: data.weight != null ? Number(data.weight) : undefined,
          dimensions: data.dimensions || undefined,
          // availability
          available: data.available ?? true,
          preOrder: data.preOrder ?? false,
          // variants
          hasVariants: !!data.hasVariants,
          variants: Array.isArray(data.variants) ? data.variants : undefined,
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
      sku: input.sku ?? null,
      weight: input.weight != null ? Number(input.weight) : null,
      dimensions: input.dimensions ?? null,
      // availability
      available: input.available ?? true,
      preOrder: input.preOrder ?? false,
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
    return { id: ref.id };
  },

  async adjustStock(itemId: string, delta: number, reason: string) {
    const ref = doc(db, ITEMS_COLLECTION, itemId);

    // Prepare adjustment log
    const itemSnap = await getDoc(ref);
    const before = Number(itemSnap.data()?.inStock ?? 0);
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
      delta: Number(delta),
      reason,
      stockBefore: before,
      stockAfter: after,
      userId: auth.currentUser?.uid ?? null,
      at: serverTimestamp(),
    });
  },
};
