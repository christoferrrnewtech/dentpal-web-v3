import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData, QuerySnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import type { Order } from '@/types/order';

const ORDER_COLLECTION = 'Order';
// Also support lowercase/plural collection naming used elsewhere in the app
const ORDER_COLLECTIONS = ['Order', 'orders'] as const;

const storage = getStorage();

// Known Category ID -> Name (keep in sync with Inventory)
const CATEGORY_ID_TO_NAME: Record<string, string> = {
  EsDNnmc72LZNMHk3SmeV: 'Disposables',
  PtqCTLGduo6vay2umpMY: 'Dental Equipment',
  iXMJ7vcFIcMjQBVfIHZp: 'Consumables',
  z5BRrsDIy92XEK1PzdM4: 'Equipment',
};

const makeItemsBrief = (items: any[] = []): string => {
  if (!items.length) return '';
  const first = items[0];
  const name = String(first.productName || first.name || 'Item');
  const qty = Number(first.quantity || 0);
  const more = items.length - 1;
  return more > 0 ? `${name} x ${qty} + ${more} more` : `${name} x ${qty}`;
};

const mapItems = (items: any[] = []): Order['items'] => {
  return items.map((it: any) => ({
    name: String(it.productName || it.name || 'Item'),
    quantity: Number(it.quantity || 0),
    price: it.price != null ? Number(it.price) : undefined,
    productId: it.productId || it.productID || it.product?.id,
    sku: it.sku || it.SKU,
    imageUrl: it.imageURL || it.imageUrl || it.thumbnail || it.photoUrl,
    category: it.category || it.Category || it.product?.category || undefined,
    subcategory: it.subcategory || it.Subcategory || it.product?.subcategory || undefined,
    categoryId: it.categoryID || it.categoryId || it.CategoryID || it.CategoryId || undefined,
    cost: it.cost != null ? Number(it.cost) : undefined,
  }));
};

const firstItemImage = (items: any[] = []): string | undefined => {
  const first = items[0];
  if (!first) return undefined;
  return first.imageURL || first.imageUrl || first.thumbnail || first.photoUrl || undefined;
};

// Timestamp helpers
const toMs = (v: any): number | undefined => {
  if (!v && v !== 0) return undefined;
  try {
    if (typeof v?.toMillis === 'function') return Number(v.toMillis());
    if (typeof v === 'number') return v < 1e12 ? v * 1000 : v; // seconds or ms
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : undefined;
    }
  } catch {}
  return undefined;
};

const pickFirstMs = (...vals: any[]): number | undefined => {
  for (const v of vals) {
    const ms = toMs(v);
    if (ms) return ms;
  }
  return undefined;
};

const extractFromHistory = (data: any, statuses: string[]): number | undefined => {
  // 1) Array form: statusHistory: [{ status: 'packed', at|timestamp|date: ... }, ...]
  const hist = Array.isArray(data?.statusHistory) ? data.statusHistory : Array.isArray(data?.history) ? data.history : undefined;
  if (Array.isArray(hist)) {
    const lower = statuses.map(s => s.toLowerCase());
    let best: number | undefined;
    hist.forEach((e: any) => {
      const st = String(e?.status || e?.state || e?.label || '').toLowerCase();
      if (!lower.includes(st)) return;
      const ms = pickFirstMs(e?.at, e?.timestamp, e?.date, e?.time, e?.ts);
      if (ms != null) best = best == null ? ms : Math.min(best, ms);
    });
    if (best != null) return best;
  }
  // 2) Object form: statusTimestamps: { packed: ..., to_ship: ..., dispatched: ... }
  const obj = data?.statusTimestamps || data?.shippingStatusTimestamps || data?.shippingInfo?.statusTimestamps;
  if (obj && typeof obj === 'object') {
    const lower = statuses.map(s => s.toLowerCase());
    let best: number | undefined;
    Object.entries(obj).forEach(([k, v]) => {
      if (!lower.includes(String(k).toLowerCase())) return;
      const ms = toMs(v);
      if (ms != null) best = best == null ? ms : Math.min(best, ms);
    });
    if (best != null) return best;
  }
  return undefined;
};

const mapDocToOrder = (id: string, data: any): Order => {
  const itemsRaw = Array.isArray(data.items) ? data.items : [];

  // Make date string only (no time)
  const createdAtMs = pickFirstMs(
    data.createdAt,
    data.orderDate,
    data.dateCreated,
    data.timestamp,
    data.created
  ) ?? Date.now();
  const dateOnly = new Date(createdAtMs).toISOString().split('T')[0];

  // Fulfillment lifecycle timestamps
  const packedMs = pickFirstMs(
    data.shippingInfo?.packedAt,
    data.packedAt,
    extractFromHistory(data, ['packed', 'to_ship', 'to-ship', 'confirmed', 'ready_to_ship'])
  );
  const handoverMs = pickFirstMs(
    data.shippingInfo?.handoverAt,
    data.handoverAt,
    data.shippingInfo?.dispatchedAt,
    data.dispatchedAt,
    extractFromHistory(data, ['dispatched', 'shipped', 'in_transit', 'in-transit', 'out_for_delivery', 'out-for-delivery'])
  );
  const deliveredMs = pickFirstMs(
    data.shippingInfo?.deliveredAt,
    data.deliveredAt,
    extractFromHistory(data, ['delivered', 'completed', 'success', 'succeeded'])
  );

  // Prefer tracking number for barcode field, with sensible fallbacks
  const tracking = String(
    data.shippingInfo?.trackingNumber ||
    data.trackingNumber ||
    data.checkoutSessionId ||
    data.paymentInfo?.checkoutSessionId ||
    id
  );

  const items = mapItems(itemsRaw);

  // Best-effort payment type extraction
  const rawPaymentType = (
    data.paymentInfo?.method ||
    data.paymentInfo?.type ||
    data.paymentInfo?.channel ||
    data.paymentMethod ||
    data.payment_type ||
    data.paymentType ||
    data.paymentChannel ||
    data.paymentGateway ||
    data.gateway ||
    ''
  );
  const paymentType = rawPaymentType ? String(rawPaymentType) : undefined;

  // Payment transaction id and cash-basis dates
  const paymentTxnId = String(
    data.paymentInfo?.transactionId ||
    data.paymentInfo?.txnId ||
    data.paymentInfo?.id ||
    data.checkoutSessionId ||
    data.payment_reference ||
    ''
  ) || undefined;
  const paidAtMs = data.paymentInfo?.paidAt?.toMillis?.() ? Number(data.paymentInfo.paidAt.toMillis()) : (typeof data.paymentInfo?.paidAt === 'number' ? (data.paymentInfo.paidAt < 1e12 ? data.paymentInfo.paidAt * 1000 : data.paymentInfo.paidAt) : undefined);
  const refundedAtMs = data.paymentInfo?.refundedAt?.toMillis?.() ? Number(data.paymentInfo.refundedAt.toMillis()) : (typeof data.paymentInfo?.refundedAt === 'number' ? (data.paymentInfo.refundedAt < 1e12 ? data.paymentInfo.refundedAt * 1000 : data.paymentInfo.refundedAt) : undefined);
  const paidAt = paidAtMs ? new Date(paidAtMs).toISOString().split('T')[0] : undefined;
  const refundedAt = refundedAtMs ? new Date(refundedAtMs).toISOString().split('T')[0] : undefined;

  // Monetary breakdowns
  const tax = data.summary?.tax != null ? Number(data.summary.tax) : (data.tax != null ? Number(data.tax) : undefined);
  const discount = data.summary?.discount != null ? Number(data.summary.discount) : (data.discount != null ? Number(data.discount) : undefined);
  const shipping = data.summary?.shipping != null ? Number(data.summary.shipping) : (data.shipping != null ? Number(data.shipping) : undefined);
  const fees = data.summary?.fees != null ? Number(data.summary.fees) : (data.fees != null ? Number(data.fees) : undefined);
  const cogs = data.summary?.cogs != null ? Number(data.summary.cogs) : (data.cogs != null ? Number(data.cogs) : undefined);

  // Derived gross margin if possible
  const total = Number(
    data.summary?.total ??
    data.paymentInfo?.amount ??
    data.totalAmount ??
    data.total ??
    0
  ) || undefined;
  const grossMargin = total != null && cogs != null ? total - cogs : undefined;

  // Region info from shipping address
  const region = {
    barangay: data.shippingInfo?.barangay || data.shippingInfo?.brgy || undefined,
    municipality: data.shippingInfo?.municipality || data.shippingInfo?.city || data.shippingInfo?.town || undefined,
    province: data.shippingInfo?.province || undefined,
    zip: data.shippingInfo?.zip || data.shippingInfo?.postalCode || undefined,
  } as Order['region'];

  // Resolve to-ship fulfillment sub-stage
  const fsRaw = String(data.fulfillmentStage || data.shippingInfo?.fulfillmentStage || '').toLowerCase();
  const fulfillmentStage: Order['fulfillmentStage'] =
    fsRaw === 'to-arrangement' ? 'to-arrangement' :
    fsRaw === 'to-hand-over' ? 'to-hand-over' : 'to-pack';

  return {
    id,
    orderCount: Number(data.summary?.totalItems || itemsRaw.length || 0),
    barcode: tracking,
    timestamp: dateOnly,
    createdAt: new Date(createdAtMs).toISOString(),
    customer: {
      name: String((data.shippingInfo?.fullName) || data.customerName || 'Unknown Customer'),
      contact: String((data.shippingInfo?.phoneNumber) || data.customerPhone || ''),
    },
    customerId: data.customerId || data.customerID || data.userId || data.userID || undefined,
    sellerIds: Array.isArray(data.sellerIds) ? data.sellerIds.map(String) : (data.sellerId ? [String(data.sellerId)] : undefined),
    region,
    sellerName: String(data.sellerName || (Array.isArray(data.sellerIds) && data.sellerIds.length > 1 ? 'Multiple Sellers' : itemsRaw[0]?.sellerName || '')) || undefined,
    itemsBrief: makeItemsBrief(itemsRaw),
    items,
    total,
    currency: String((data.paymentInfo?.currency) || 'PHP'),
    paymentType,
    paymentTxnId,
    paidAt,
    refundedAt,
    tax,
    discount,
    shipping,
    fees,
    cogs,
    grossMargin,
    imageUrl: firstItemImage(itemsRaw),
    // Fulfillment lifecycle as ISO strings if available
    packedAt: packedMs ? new Date(packedMs).toISOString() : undefined,
    handoverAt: handoverMs ? new Date(handoverMs).toISOString() : undefined,
    deliveredAt: deliveredMs ? new Date(deliveredMs).toISOString() : undefined,
    package: { size: 'medium', dimensions: `${data.shippingInfo?.addressLine1 ? '' : ''}`.trim(), weight: '' },
    priority: 'normal',
    status: (() => {
      const shippingStatus = String(data.shippingInfo?.status || '').toLowerCase();
      const paymentStatus = String(data.paymentInfo?.status || '').toLowerCase();
      const topLevelStatus = String(data.status || '').toLowerCase();
      if (['delivered', 'completed', 'success', 'succeeded'].includes(shippingStatus) || ['delivered', 'completed', 'success', 'succeeded'].includes(topLevelStatus)) return 'completed';
      if (['failed-delivery', 'delivery_failed', 'failed_delivery'].includes(shippingStatus) || ['failed-delivery', 'delivery_failed', 'failed_delivery'].includes(topLevelStatus)) return 'failed-delivery';
      if (['shipping', 'in_transit', 'in-transit', 'dispatched', 'out_for_delivery', 'out-for-delivery'].includes(shippingStatus)) return 'processing';
      if (['confirmed', 'to_ship', 'to-ship', 'packed', 'ready_to_ship'].includes(shippingStatus) || ['confirmed', 'to_ship', 'to-ship', 'packed', 'ready_to_ship'].includes(topLevelStatus) || ['paid', 'success', 'succeeded'].includes(paymentStatus)) return 'to-ship';
      if (['cancelled', 'canceled'].includes(topLevelStatus) || ['failed', 'payment_failed', 'refused'].includes(paymentStatus)) return 'cancelled';
      if (['pending', 'unpaid'].includes(paymentStatus) || ['pending', 'unpaid'].includes(topLevelStatus)) return 'pending';
      return 'pending';
    })(),
    fulfillmentStage,
  };
};

// Hydrate order imageUrl from first item's Product doc
const hydrateImageUrl = async (order: Order, data: any): Promise<Order> => {
  const items = Array.isArray(order.items) ? order.items : [];
  const first: any = items[0] || {};
  const pid = first.productId || first.productID || first.product?.id || data.productId || data.productID;
  if (!pid) return order;
  try {
    const pSnap = await getDoc(doc(db, 'Product', String(pid)));
    if (pSnap.exists()) {
      const p: any = pSnap.data();
      const img = p.imageURL || p.imageUrl;
      if (img) {
        let resolvedImg: string;
        if (String(img).startsWith('gs://')) {
          resolvedImg = await getDownloadURL(ref(storage, img));
        } else {
          resolvedImg = String(img);
        }
        return { ...order, imageUrl: resolvedImg };
      }
    }
  } catch {}
  return order;
};

// Hydrate item categories from Product docs
const hydrateItemCategories = async (order: Order, productCache: Map<string, any>): Promise<Order> => {
  const items = Array.isArray(order.items) ? order.items : [];
  const missing = Array.from(new Set(items
    .map(it => it?.productId)
    .filter(pid => !!pid && !items.find(it => it.productId === pid && it.category && String(it.category).trim()))
  )).map(String);
  if (missing.length === 0) return order;

  for (const pid of missing) {
    if (!productCache.has(pid)) {
      try {
        const snap = await getDoc(doc(db, 'Product', pid));
        productCache.set(pid, snap.exists() ? snap.data() : null);
      } catch {
        productCache.set(pid, null);
      }
    }
  }

  const itemsNext = items.map(async (it) => {
    if (it.category && String(it.category).trim() && it.categoryId) return it;
    const pid = it.productId ? String(it.productId) : '';
    const p: any = pid ? productCache.get(pid) : null;
    if (!p) return it;
    const catLabel = String(p.category || p.Category || '').trim();
    const catId = p.categoryID || p.categoryId || p.CategoryID || p.CategoryId;
    const resolved = catLabel || (catId ? CATEGORY_ID_TO_NAME[String(catId)] || '' : '');
    const sub = p.subcategory || p.Subcategory || undefined;
    const cost = p.cost != null ? Number(p.cost) : undefined;
    const img = p.imageURL || p.imageUrl || p.thumbnail;
    let resolvedImg: string | undefined;
    if (img) {
      if (String(img).startsWith('gs://')) {
        try {
          resolvedImg = await getDownloadURL(ref(storage, img));
        } catch {
          resolvedImg = undefined;
        }
      } else {
        resolvedImg = String(img);
      }
    }
    if (!resolved && !sub && !catId && cost == null && !resolvedImg) return it;
    return { ...it, ...(resolved ? { category: resolved } : {}), ...(sub ? { subcategory: String(sub) } : {}), ...(catId ? { categoryId: String(catId) } : {}), ...(cost != null ? { cost } : {}), ...(resolvedImg ? { imageUrl: resolvedImg } : {}) };
  });
  const resolvedItems = await Promise.all(itemsNext);
  return { ...order, items: resolvedItems };
};

const OrdersService = {
  listenBySeller(sellerId: string, cb: (orders: Order[]) => void) {
    const latest: Record<string, Order[]> = {};
    const unsubs: Array<() => void> = [];
    const emit = () => {
      const merged = Object.values(latest).flat();
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      cb(merged);
    };
    ORDER_COLLECTIONS.forEach((name) => {
      // Two shapes: sellerIds (array) and sellerId (string)
      const q1 = query(collection(db, name), where('sellerIds', 'array-contains', sellerId));
      const q2 = query(collection(db, name), where('sellerId', '==', sellerId));
      const handleSnap = async (snap: QuerySnapshot<DocumentData>, key: string) => {
        const productCache = new Map<string, any>();
        const orders = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          let o = mapDocToOrder(d.id, data);
          o = await hydrateImageUrl(o, data);
          o = await hydrateItemCategories(o, productCache);
          return o;
        }));
        latest[key] = orders;
        emit();
      };
      const u1 = onSnapshot(q1, (snap) => handleSnap(snap, `${name}#sellerIds`));
      const u2 = onSnapshot(q2, (snap) => handleSnap(snap, `${name}#sellerId`));
      unsubs.push(u1, u2);
    });
    return () => { unsubs.forEach(u => { try { u(); } catch {} }); };
  },
  // Admin: listen to all orders across both collections
  listenAll(cb: (orders: Order[]) => void) {
    const latest: Record<string, Order[]> = {};
    const unsubs: Array<() => void> = [];
    const emit = () => {
      const merged = Object.values(latest).flat();
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      cb(merged);
    };
    ORDER_COLLECTIONS.forEach((name) => {
      const qRef = query(collection(db, name));
      const unsub = onSnapshot(qRef, async (snap: QuerySnapshot<DocumentData>) => {
        const productCache = new Map<string, any>();
        const orders = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          let o = mapDocToOrder(d.id, data);
          o = await hydrateImageUrl(o, data);
          o = await hydrateItemCategories(o, productCache);
          return o;
        }));
        latest[name] = orders;
        emit();
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach(u => { try { u(); } catch {} }); };
  },
  // Update order fulfillment stage
  updateFulfillmentStage: async (orderId: string, stage: 'to-pack' | 'to-arrangement' | 'to-hand-over'): Promise<void> => {
    try {
      // Try both collection names
      for (const coll of ORDER_COLLECTIONS) {
        const docRef = doc(db, coll, orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { fulfillmentStage: stage });
          return;
        }
      }
      throw new Error(`Order ${orderId} not found`);
    } catch (error) {
      console.error('Error updating order fulfillment stage:', error);
      throw error;
    }
  },
  // New: update high-level order status (e.g., move to Shipping)
  updateOrderStatus: async (
    orderId: string,
    status: 'pending' | 'to-ship' | 'processing' | 'completed' | 'cancelled' | 'returned' | 'refunded' | 'return_refund' | 'failed-delivery'
  ): Promise<void> => {
    try {
      for (const coll of ORDER_COLLECTIONS) {
        const docRef = doc(db, coll, orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await updateDoc(docRef, { status });
          return;
        }
      }
      throw new Error(`Order ${orderId} not found`);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
};

export default OrdersService;
