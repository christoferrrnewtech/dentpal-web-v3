import React, { useMemo, useState } from 'react';
import { Order } from '@/types/order';
import { Search, RefreshCcw } from 'lucide-react';
import { SUB_TABS, mapOrderToStage, LifecycleStage } from './config';
import AllOrdersView from './views/AllOrdersView';
import UnpaidOrdersView from './views/UnpaidOrdersView';
import ToShipOrdersView from './views/ToShipOrdersView';
import ShippingOrdersView from './views/ShippingOrdersView';
import DeliveredOrdersView from './views/DeliveredOrdersView';
import FailedDeliveryOrdersView from './views/FailedDeliveryOrdersView';

/**
 * OrderTab
 * Professional, scalable UI for managing seller orders with horizontal filter bar.
 * Future extension points are clearly marked with comments.
 */
interface OrderTabProps {
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelectOrder?: (order: Order) => void;
}

const viewMap: Record<LifecycleStage, React.FC<{ orders: Order[]; onSelectOrder?: (o: Order) => void }>> = {
  'all': AllOrdersView,
  'unpaid': UnpaidOrdersView,
  'to-ship': ToShipOrdersView,
  'shipping': ShippingOrdersView,
  'delivered': DeliveredOrdersView,
  'failed-delivery': FailedDeliveryOrdersView,
};

export const OrderTab: React.FC<OrderTabProps> = ({
  orders,
  loading = false,
  error,
  onRefresh,
  onSelectOrder
}) => {
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<LifecycleStage>('all');

  // Precompute counts per sub tab for badges
  const countsBySubTab = useMemo(() => {
    const base: Record<LifecycleStage, number> = { 'all': 0, 'unpaid': 0, 'to-ship': 0, 'shipping': 0, 'delivered': 0, 'failed-delivery': 0 };
    orders.forEach(o => { const stage = mapOrderToStage(o); base[stage] += 1; base.all += 1; });
    return base;
  }, [orders]);

  const filtered = useMemo(() => orders.filter(o => {
    // TODO: integrate query / status / payment filtering (previous logic trimmed for modularization) later
    if (activeSubTab === 'all') return true;
    return SUB_TABS.find(t => t.id === activeSubTab)?.predicate(o) || false;
  }), [orders, activeSubTab]);

  const ActiveView = viewMap[activeSubTab];

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {SUB_TABS.map(tab => {
            const isActive = tab.id === activeSubTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60
                  ${isActive ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}
                `}
              >
                <span>{tab.label}</span>
                <span className={`ml-2 inline-flex items-center justify-center text-[11px] font-semibold rounded-full px-1.5 min-w-[1.25rem]
                  ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{countsBySubTab[tab.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders View */}
      <ActiveView orders={filtered} onSelectOrder={onSelectOrder} />
    </div>
  );
};

export default OrderTab;
