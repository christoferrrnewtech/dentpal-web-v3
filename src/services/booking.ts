import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Order } from '../types/order';
import type { BookingFormInput } from '../types/booking';

const COLLECTION = 'Bookings';

function mapDocToOrder(snap: { id: string; data: () => DocumentData | undefined }): Order {
  const data = snap.data() || ({} as any);
  // Derive UI Order view from new booking doc shape if present
  const legacy = data;
  const hasFormShape = !!(data.sender && data.recipient && data.orderDetails);
  const customer = hasFormShape
    ? { name: data.recipient?.name ?? '', contact: data.recipient?.phone ?? '' }
    : { name: legacy.customer?.name ?? '', contact: legacy.customer?.contact ?? '' };
  const timestamp = typeof legacy.timestamp === 'string'
    ? legacy.timestamp
    : new Date().toISOString();

  return {
    id: (snap as any).id,
    orderCount: Number(legacy.orderCount ?? 1),
    barcode: String(legacy.barcode ?? ''),
    timestamp,
    customer,
    package: {
      size: (legacy.package?.size ?? 'medium') as Order['package']['size'],
      dimensions: String(legacy.package?.dimensions ?? ''),
      weight: String(legacy.package?.weight ?? ''),
    },
    priority: (legacy.priority ?? 'normal') as Order['priority'],
    status: (legacy.status ?? 'pending') as Order['status'],
  };
}

export const BookingService = {
  // Create a booking document under 'Bookings'
  async create(input: Partial<Order> & { status?: Order['status'] } = {}) {
    const payload = {
      orderCount: input.orderCount ?? 1,
      barcode: input.barcode ?? '',
      // Store ISO string to match UI needs
      timestamp: new Date().toISOString(),
      customer: {
        name: input.customer?.name ?? '',
        contact: input.customer?.contact ?? '',
      },
      package: {
        size: input.package?.size ?? 'medium',
        dimensions: input.package?.dimensions ?? '',
        weight: input.package?.weight ?? '',
      },
      priority: input.priority ?? 'normal',
      status: (input.status ?? 'pending') as Order['status'],
      createdBy: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any;

    const ref = await addDoc(collection(db, COLLECTION), payload);
    const snap = await getDoc(ref);
    return mapDocToOrder({ id: ref.id, data: () => snap.data() });
  },

  async createFromForm(input: BookingFormInput, opts?: { status?: Order['status'] }) {
    const payload = {
      sender: input.sender,
      recipient: input.recipient,
      dropPoint: input.dropPoint,
      orderDetails: input.orderDetails,
      status: (opts?.status ?? 'pending') as Order['status'],
      customer: { name: input.recipient.name, contact: input.recipient.phone },
      createdBy: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as const;

    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
  },

  async update(id: string, updates: Partial<Omit<Order, 'id'>>) {
    await updateDoc(doc(db, COLLECTION, id), {
      ...updates,
      updatedAt: serverTimestamp(),
    } as any);
  },

  async updateStatus(id: string, status: Order['status']) {
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  },

  async bulkUpdateStatus(ids: string[], status: Order['status']) {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.update(doc(db, COLLECTION, id), { status, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  },

  async getByStatus(status: Order['status']): Promise<Order[]> {
    const q = query(collection(db, COLLECTION), where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToOrder(d as any));
  },

  listenByStatus(status: Order['status'], cb: (orders: Order[]) => void): () => void {
    const q = query(collection(db, COLLECTION), where('status', '==', status));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => mapDocToOrder(d as any));
      cb(rows);
    });
  },
};
