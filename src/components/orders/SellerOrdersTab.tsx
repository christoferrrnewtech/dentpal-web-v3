import React, { useMemo, useState } from 'react';
import { Order } from '@/types/order';
import { Search, Filter, RefreshCcw } from 'lucide-react';

/**
 * SellerOrdersTab
 * Professional, scalable UI for managing seller orders with horizontal filter bar.
 * Future extension points are clearly marked with comments.
 */
interface SellerOrdersTabProps {
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelectOrder?: (order: Order) => void;
}

const dateRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last year', value: '1y' },
];

const paymentTypes = ['All', 'Full', 'Partial', 'Installment'];
const statuses: Order['status'][] = ['pending', 'processing', 'completed'];

export const SellerOrdersTab: React.FC<SellerOrdersTabProps> = ({
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

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchesQuery = !query || o.customer.name.toLowerCase().includes(query.toLowerCase()) || o.id.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = !status || o.status === status;
      // Placeholder logic for paymentType & dateRange until data model extended
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, status]);

  return (
    <div className="space-y-6">
      {/* Filters / Actions Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-12 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">SEARCH</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Order ID or customer"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">DATE RANGE</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="">All</option>
              {dateRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">PAYMENT TYPE</label>
            <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              {paymentTypes.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="">All</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-3 flex gap-2 justify-end">
            <button
              onClick={() => { setQuery(''); setDateRange(''); setPaymentType(''); setStatus(''); }}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >Reset</button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Orders List Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Orders <span className="text-sm font-normal text-gray-500">({filtered.length})</span></h3>
      </div>

      {/* Orders Table / Cards */}
      <div className="space-y-4">
        {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>}
        {filtered.map(order => (
          <button
            key={order.id}
            onClick={() => onSelectOrder?.(order)}
            className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center gap-4 group"
          >
            <div className="flex-1 flex items-center gap-6">
              <div className="w-20 text-xs font-medium text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 group-hover:text-teal-600 transition">{order.customer.name}</p>
                <p className="text-xs text-gray-500">{order.id}</p>
              </div>
              <div className="text-sm font-medium capitalize px-2 py-1 rounded bg-gray-100 text-gray-700">{order.status}</div>
              <div className="hidden lg:block text-xs text-gray-500">{order.package.size} / {order.package.weight}</div>
            </div>
            <div>
              <span className="text-xs px-3 py-1 border border-teal-600 text-teal-700 rounded-md font-medium group-hover:bg-teal-50">CONTACT NO</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="p-8 text-center border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 bg-white">
            No orders match current filters.
          </div>
        )}
        {loading && (
          <div className="p-8 text-center text-sm text-gray-500">Loading orders...</div>
        )}
      </div>
    </div>
  );
};

export default SellerOrdersTab;
