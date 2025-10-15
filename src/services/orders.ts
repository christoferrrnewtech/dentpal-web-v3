import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData, QuerySnapshot, doc, getDoc } from 'firebase/firestore';
import type { Order } from '@/types/order';

const ORDER_COLLECTION = 'Order';

const makeItemsBrief = (items: any[] = []): string => {
  if (!items.length) return '';
  const first = items[0];
  const name = String(first.productName || first.name || 'Item');
  const qty = Number(first.quantity || 0);
  const more = items.length - 1;
  return more > 0 ? `${name} x ${qty} + ${more} more` : `${name} x ${qty}`;
};

const firstItemImage = (items: any[] = []): string | undefined => {
  const first = items[0];
  if (!first) return undefined;
  return first.imageURL || first.imageUrl || first.thumbnail || first.photoUrl || undefined;
};

const mapDocToOrder = (id: string, data: any): Order => {
  const items = Array.isArray(data.items) ? data.items : [];

  // Make date string only (no time)
  const createdAtMs = data.createdAt?.toMillis?.() ? Number(data.createdAt.toMillis()) : (typeof data.createdAt === 'number' ? data.createdAt : Date.now());
  const dateOnly = new Date(createdAtMs).toISOString().split('T')[0];

  return {
    id,
    orderCount: Number(data.summary?.totalItems || items.length || 0),
    barcode: String(data.checkoutSessionId || (data.paymentInfo?.checkoutSessionId) || id),
    timestamp: dateOnly,
    customer: {
      name: String((data.shippingInfo?.fullName) || data.customerName || 'Unknown Customer'),
      contact: String((data.shippingInfo?.phoneNumber) || data.customerPhone || ''),
    },
    sellerName: String(data.sellerName || (Array.isArray(data.sellerIds) && data.sellerIds.length > 1 ? 'Multiple Sellers' : items[0]?.sellerName || '')) || undefined,
    itemsBrief: makeItemsBrief(items),
    total: Number(data.summary?.total ?? data.paymentInfo?.amount ?? 0) || undefined,
    currency: String((data.paymentInfo?.currency) || 'PHP'),
    imageUrl: firstItemImage(items),
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

export const OrdersService = {
  listenBySeller(sellerId: string, cb: (orders: Order[]) => void) {
    const qRef = query(collection(db, ORDER_COLLECTION), where('sellerIds', 'array-contains', sellerId));
    const unsub = onSnapshot(qRef, async (snap: QuerySnapshot<DocumentData>) => {
      const orders = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let o = mapDocToOrder(d.id, data);
        o = await hydrateImageUrl(o, data);
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
      const orders = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let o = mapDocToOrder(d.id, data);
        o = await hydrateImageUrl(o, data);
        return o;
      }));
      orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      cb(orders);
    });
    return unsub;
  }
};

export default OrdersService;
