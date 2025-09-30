import { Order } from '@/types/order';

export type LifecycleStage = 'all' | 'unpaid' | 'to-ship' | 'shipping' | 'delivered' | 'failed-delivery';

export interface SubTabConfig {
  id: LifecycleStage;
  label: string;
  predicate: (o: Order) => boolean; // stage membership
}

// Provisional mapping using current simplified status values
export const mapOrderToStage = (o: Order): LifecycleStage => {
  switch (o.status) {
    case 'pending': return 'unpaid';
    case 'processing': return 'shipping';
    case 'completed': return 'delivered';
    default: return 'all';
  }
};

export const SUB_TABS: SubTabConfig[] = [
  { id: 'all', label: 'All', predicate: () => true },
  { id: 'unpaid', label: 'Unpaid', predicate: (o) => mapOrderToStage(o) === 'unpaid' },
  { id: 'to-ship', label: 'To Ship', predicate: (o) => mapOrderToStage(o) === 'to-ship' }, // placeholder until backend distinguishes
  { id: 'shipping', label: 'Shipping', predicate: (o) => mapOrderToStage(o) === 'shipping' },
  { id: 'delivered', label: 'Delivered', predicate: (o) => mapOrderToStage(o) === 'delivered' },
  { id: 'failed-delivery', label: 'Failed Delivery', predicate: (o) => mapOrderToStage(o) === 'failed-delivery' },
];
