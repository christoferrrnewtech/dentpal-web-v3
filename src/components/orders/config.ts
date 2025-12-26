import { Order } from '@/types/order';

export type LifecycleStage = 'all' | 'unpaid' | 'confirmed' | 'to-ship' | 'shipping' | 'delivered' | 'failed-delivery' | 'cancellation' | 'return-refund';

export type ToShipStage = 'to-pack' | 'to-arrangement' | 'to-hand-over';

export interface SubTabConfig {
  id: LifecycleStage;
  label: string;
  predicate: (o: Order) => boolean; // stage membership
}

// Provisional mapping using current simplified status values
export const mapOrderToStage = (o: Order): LifecycleStage => {
  switch (o.status) {
    case 'pending': return 'unpaid';
    case 'confirmed': return 'confirmed'; // Orders confirmed/paid but not yet moved to fulfillment
    case 'to_ship': return 'to-ship';
    case 'processing': return 'shipping';
    case 'shipping': return 'shipping';
    case 'shipped': return 'shipping';
    case 'completed': return 'delivered';
    case 'failed-delivery': return 'failed-delivery';
    case 'cancelled': return 'cancellation';
    case 'return_requested':
    case 'return_approved':
    case 'return_rejected':
    case 'returned':
    case 'refunded':
    case 'return_refund':
      return 'return-refund';
    default: return 'all';
  }
};

export const SUB_TABS: SubTabConfig[] = [
  { id: 'all', label: 'All', predicate: () => true },
  { id: 'unpaid', label: 'Unpaid', predicate: (o) => mapOrderToStage(o) === 'unpaid' },
  { id: 'confirmed', label: 'Confirmed', predicate: (o) => mapOrderToStage(o) === 'confirmed' },
  { id: 'to-ship', label: 'To Ship', predicate: (o) => mapOrderToStage(o) === 'to-ship' },
  { id: 'shipping', label: 'Shipping', predicate: (o) => mapOrderToStage(o) === 'shipping' },
  { id: 'delivered', label: 'Delivered', predicate: (o) => mapOrderToStage(o) === 'delivered' },
  { id: 'failed-delivery', label: 'Failed Delivery', predicate: (o) => o.status === 'failed-delivery' },
  { id: 'cancellation', label: 'Cancellation', predicate: (o) => o.status === 'cancelled' },
  { id: 'return-refund', label: 'Return or Refund', predicate: (o) => ['return_requested', 'return_approved', 'return_rejected', 'returned', 'refunded', 'return_refund'].includes(o.status) },
];

export const TO_SHIP_SUB_TABS: { id: ToShipStage; label: string }[] = [
  { id: 'to-pack', label: 'To Pack' },
  { id: 'to-arrangement', label: 'To Arrangement' },
  { id: 'to-hand-over', label: 'To Hand Over' },
];
