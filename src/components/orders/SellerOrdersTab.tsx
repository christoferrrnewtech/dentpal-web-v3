import React, { useMemo, useState, useEffect } from 'react';
import { Order } from '@/types/order';
import { Search, RefreshCcw } from 'lucide-react';
import { SUB_TABS, mapOrderToStage, LifecycleStage } from './config';
import AllOrdersView from './views/AllOrdersView';
import UnpaidOrdersView from './views/UnpaidOrdersView';
import ToShipOrdersView from './views/ToShipOrdersView';
import ShippingOrdersView from './views/ShippingOrdersView';
import DeliveredOrdersView from './views/DeliveredOrdersView';
import FailedDeliveryOrdersView from './views/FailedDeliveryOrdersView';
import CancellationOrdersView from './views/CancellationOrdersView.tsx';
import ReturnRefundOrdersView from './views/ReturnRefundOrdersView.tsx';

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
  'cancellation': CancellationOrdersView,
  'return-refund': ReturnRefundOrdersView,
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
  // New: date range pickers (from/to)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to first page when filters or tab change
  useEffect(() => { setPage(1); }, [activeSubTab, dateFrom, dateTo]);

  // Date-filter orders once for reuse (also powers counts)
  const dateFilteredOrders = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    if (!from && !to) return orders;
    return orders.filter(o => {
      const ts = new Date(o.timestamp);
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  // Precompute counts per sub tab for badges (now respects date range)
  const countsBySubTab = useMemo(() => {
    const base: Record<LifecycleStage, number> = { 'all': 0, 'unpaid': 0, 'to-ship': 0, 'shipping': 0, 'delivered': 0, 'failed-delivery': 0, 'cancellation': 0, 'return-refund': 0 };
    dateFilteredOrders.forEach(o => { const stage = mapOrderToStage(o); base[stage] += 1; base.all += 1; });
    return base;
  }, [dateFilteredOrders]);

  const filtered = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      // stage filter
      if (activeSubTab !== 'all' && !SUB_TABS.find(t => t.id === activeSubTab)?.predicate(o)) return false;
      return true;
    });
  }, [dateFilteredOrders, activeSubTab]);

  // Compute pagination
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedOrders = filtered.slice(startIdx, startIdx + pageSize);
  const rangeStart = total === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + pageSize, total);

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

      {/* Filters: From / To date pickers */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">From date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e)=> setDateFrom(e.target.value)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">To date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e)=> setDateTo(e.target.value)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          Clear dates
        </button>
      </div>

      {/* Orders View */}
      <ActiveView orders={pagedOrders} onSelectOrder={onSelectOrder} />

      {/* Pagination */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 mr-2">
          <span>Rows per page</span>
          <select
            className="p-1.5 border border-gray-200 rounded-md text-xs"
            value={pageSize}
            onChange={(e)=> { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ml-3">{rangeStart}-{rangeEnd} of {total}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTab;
