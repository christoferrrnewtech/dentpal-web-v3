import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData, QuerySnapshot, doc, getDoc } from 'firebase/firestore';
import type { Order } from '@/types/order';

const ORDER_COLLECTION = 'Order';

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

const mapDocToOrder = (id: string, data: any): Order => {
  const itemsRaw = Array.isArray(data.items) ? data.items : [];

  // Make date string only (no time)
  const createdAtMs = data.createdAt?.toMillis?.() ? Number(data.createdAt.toMillis()) : (typeof data.createdAt === 'number' ? data.createdAt : Date.now());
  const dateOnly = new Date(createdAtMs).toISOString().split('T')[0];

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
  const paidAtMs = data.paymentInfo?.paidAt?.toMillis?.() ? Number(data.paymentInfo.paidAt.toMillis()) : (typeof data.paymentInfo?.paidAt === 'number' ? data.paymentInfo.paidAt : undefined);
  const refundedAtMs = data.paymentInfo?.refundedAt?.toMillis?.() ? Number(data.paymentInfo.refundedAt.toMillis()) : (typeof data.paymentInfo?.refundedAt === 'number' ? data.paymentInfo.refundedAt : undefined);
  const paidAt = paidAtMs ? new Date(paidAtMs).toISOString().split('T')[0] : undefined;
  const refundedAt = refundedAtMs ? new Date(refundedAtMs).toISOString().split('T')[0] : undefined;

  // Monetary breakdowns
  const tax = data.summary?.tax != null ? Number(data.summary.tax) : (data.tax != null ? Number(data.tax) : undefined);
  const discount = data.summary?.discount != null ? Number(data.summary.discount) : (data.discount != null ? Number(data.discount) : undefined);
  const shipping = data.summary?.shipping != null ? Number(data.summary.shipping) : (data.shipping != null ? Number(data.shipping) : undefined);
  const fees = data.summary?.fees != null ? Number(data.summary.fees) : (data.fees != null ? Number(data.fees) : undefined);
  const cogs = data.summary?.cogs != null ? Number(data.summary.cogs) : (data.cogs != null ? Number(data.cogs) : undefined);

  // Derived gross margin if possible
  const total = Number(data.summary?.total ?? data.paymentInfo?.amount ?? 0) || undefined;
  const grossMargin = total != null && cogs != null ? total - cogs : undefined;

  // Region info from shipping address
  const region = {
    barangay: data.shippingInfo?.barangay || data.shippingInfo?.brgy || undefined,
    municipality: data.shippingInfo?.municipality || data.shippingInfo?.city || data.shippingInfo?.town || undefined,
    province: data.shippingInfo?.province || undefined,
    zip: data.shippingInfo?.zip || data.shippingInfo?.postalCode || undefined,
  } as Order['region'];

  return {
    id,
    orderCount: Number(data.summary?.totalItems || itemsRaw.length || 0),
    barcode: tracking,
    timestamp: dateOnly,
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
  };
};

// Hydrate missing imageUrl by fetching Product.imageURL
const hydrateImageUrl = async (order: Order, data: any): Promise<Order> => {
  if (order.imageUrl) return order;
  const items = Array.isArray(data.items) ? data.items : [];
  const first = items[0] || {};
  const pid = first.productId || first.productID || first.product?.id || data.productId || data.productID;
  if (!pid) return order;
  try {
    const pSnap = await getDoc(doc(db, 'Product', String(pid)));
    if (pSnap.exists()) {
      const p: any = pSnap.data();
      const img = p.imageURL || p.imageUrl;
      if (img) return { ...order, imageUrl: String(img) };
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

  const itemsNext = items.map(it => {
    if (it.category && String(it.category).trim() && it.categoryId) return it;
    const pid = it.productId ? String(it.productId) : '';
    const p: any = pid ? productCache.get(pid) : null;
    if (!p) return it;
    const catLabel = String(p.category || p.Category || '').trim();
    const catId = p.categoryID || p.categoryId || p.CategoryID || p.CategoryId;
    const resolved = catLabel || (catId ? CATEGORY_ID_TO_NAME[String(catId)] || '' : '');
    const sub = p.subcategory || p.Subcategory || undefined;
    const cost = p.cost != null ? Number(p.cost) : undefined;
    if (!resolved && !sub && !catId && cost == null) return it;
    return { ...it, ...(resolved ? { category: resolved } : {}), ...(sub ? { subcategory: String(sub) } : {}), ...(catId ? { categoryId: String(catId) } : {}), ...(cost != null ? { cost } : {}) };
  });
  return { ...order, items: itemsNext };
};

export const OrdersService = {
  listenBySeller(sellerId: string, cb: (orders: Order[]) => void) {
    const qRef = query(collection(db, ORDER_COLLECTION), where('sellerIds', 'array-contains', sellerId));
    const unsub = onSnapshot(qRef, async (snap: QuerySnapshot<DocumentData>) => {
      const productCache = new Map<string, any>();
      const orders = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let o = mapDocToOrder(d.id, data);
        o = await hydrateImageUrl(o, data);
        o = await hydrateItemCategories(o, productCache);
        return o;
      }));
      orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      cb(orders);
    });
    return unsub;
  },
  // Admin: listen to all orders
  listenAll(cb: (orders: Order[]) => void) {
    const qRef = query(collection(db, ORDER_COLLECTION));
    const unsub = onSnapshot(qRef, async (snap: QuerySnapshot<DocumentData>) => {
      const productCache = new Map<string, any>();
      const orders = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let o = mapDocToOrder(d.id, data);
        o = await hydrateImageUrl(o, data);
        o = await hydrateItemCategories(o, productCache);
        return o;
      }));
      orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      cb(orders);
    });
    return unsub;
  }
};

export default OrdersService;
