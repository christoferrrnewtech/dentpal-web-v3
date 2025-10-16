import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OrdersService } from '@/services/orders';
import type { Order } from '@/types/order';

// Aggregated row shape for the grid
interface ReportRow {
  key: string; // group key (Item name or Payment Type)
  itemsSold: number;
  grossSales: number;
  itemsRefunded: number;
  refunds: number;
  netSales: number;
}

type SubTab = 'item' | 'payment';

const formatCurrency = (n: number) => `₱${(n || 0).toLocaleString()}`;

const withinRange = (dateStr: string, range: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  const clone = (dt: Date) => new Date(dt.getTime());
  let from = new Date(0);
  let to = clone(today);
  switch (range) {
    case 'today': from = clone(today); break;
    case 'last_7': from = new Date(today.getTime() - 6*86400000); break;
    case 'last_30': from = new Date(today.getTime() - 29*86400000); break;
    case 'this_month': from = new Date(today.getFullYear(), today.getMonth(), 1); break;
    case 'last_month': from = new Date(today.getFullYear(), today.getMonth()-1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); break;
    case 'ytd': from = new Date(today.getFullYear(), 0, 1); break;
    default: return true;
  }
  return d >= from && d <= to;
};

const getPaymentBucket = (o: Order): string => {
  switch (o.status) {
    case 'pending': return 'Unpaid';
    case 'cancelled': return 'Cancelled';
    case 'failed-delivery': return 'Failed Delivery';
    case 'returned':
    case 'refunded':
    case 'return_refund':
      return 'Refunded';
    case 'to-ship':
    case 'processing':
    case 'completed':
      return 'Paid';
    default: return 'Unknown';
  }
};

const ReportsTab: React.FC = () => {
  const { isAdmin, uid } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<SubTab>('item');
  const [dateRange, setDateRange] = useState<string>('last_30');
  const [query, setQuery] = useState('');

  // Subscribe to orders based on role
  useEffect(() => {
    let unsub = () => {};
    if (isAdmin) unsub = OrdersService.listenAll(setOrders);
    else if (uid) unsub = OrdersService.listenBySeller(uid, setOrders);
    return () => unsub();
  }, [isAdmin, uid]);

  // Filter by date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => withinRange(o.timestamp, dateRange));
  }, [orders, dateRange]);

  // Helpers to compute numbers from orders/items
  const sumItemsSold = (os: Order[]) => os.reduce((acc, o) => acc + (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);
  const sumGrossSales = (os: Order[]) => os.reduce((acc, o) => {
    if (typeof o.total === 'number') return acc + o.total;
    const itemsTotal = o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0;
    return acc + itemsTotal;
  }, 0);
  const refundStatuses: Order['status'][] = ['returned','refunded','return_refund'];
  const sumRefunds = (os: Order[]) => os.filter(o => refundStatuses.includes(o.status)).reduce((acc, o) => acc + (o.total || 0), 0);
  const sumItemsRefunded = (os: Order[]) => os.filter(o => refundStatuses.includes(o.status)).reduce((acc, o) => acc + (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);

  // Aggregations
  const itemRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const key = it.name || 'Unknown Item';
        const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
        r.itemsSold += it.quantity || 0;
        r.grossSales += (it.price || 0) * (it.quantity || 0);
        if (refundStatuses.includes(o.status)) {
          r.itemsRefunded += it.quantity || 0;
          r.refunds += (it.price || 0) * (it.quantity || 0);
        }
        byKey.set(key, r);
      });
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  const paymentRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      const key = getPaymentBucket(o);
      const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
      r.itemsSold += (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0);
      r.grossSales += typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      if (refundStatuses.includes(o.status)) {
        r.itemsRefunded += (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0);
        r.refunds += typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      }
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  const data = useMemo(() => {
    const rows = (active === 'item' ? itemRows : paymentRows)
      .filter(r => !query || r.key.toLowerCase().includes(query.toLowerCase()));
    return rows;
  }, [active, itemRows, paymentRows, query]);

  const firstColHeader = active === 'item' ? 'Item' : 'Payment Type';

  // Totals for footer
  const totals = useMemo(() => {
    const grossSales = sumGrossSales(filteredOrders);
    const refunds = sumRefunds(filteredOrders);
    const netSales = Math.max(0, grossSales - refunds);
    const itemsSold = sumItemsSold(filteredOrders);
    const itemsRefunded = sumItemsRefunded(filteredOrders);
    return { grossSales, refunds, netSales, itemsSold, itemsRefunded };
  }, [filteredOrders]);

  const exportCsv = () => {
    const cols = [firstColHeader, 'Items Sold', 'Gross Sales', 'Items Refunded', 'Refunds', 'Net Sales'];
    const header = cols.join(',');
    const body = data.map(r => [r.key, r.itemsSold, r.grossSales, r.itemsRefunded, r.refunds, r.netSales].join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reports-${active}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'item', label: 'Sales by Item' },
          { id: 'payment', label: 'Sales by Payment' },
        ].map(t => (
          <button
            key={t.id}
            className={`px-3 py-1.5 text-sm font-medium rounded ${active === (t.id as SubTab) ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            onClick={() => setActive(t.id as SubTab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="last_7">Last 7 days</option>
            <option value="last_30">Last 30 days</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${firstColHeader.toLowerCase()}`}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => exportCsv()}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => {/* no-op, data is live */}}>
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Data grid */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-3 py-2">{firstColHeader}</th>
              <th className="px-3 py-2">Items Sold</th>
              <th className="px-3 py-2">Gross Sales</th>
              <th className="px-3 py-2">Items Refunded</th>
              <th className="px-3 py-2">Refunds</th>
              <th className="px-3 py-2">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr key={r.key} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-medium text-gray-900">{r.key}</td>
                <td className="px-3 py-2">{r.itemsSold.toLocaleString()}</td>
                <td className="px-3 py-2">{formatCurrency(r.grossSales)}</td>
                <td className="px-3 py-2">{r.itemsRefunded.toLocaleString()}</td>
                <td className="px-3 py-2">{formatCurrency(r.refunds)}</td>
                <td className="px-3 py-2 font-semibold text-teal-700">{formatCurrency(r.netSales)}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No data for the selected range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><div className="text-xs text-gray-500">Gross Sales</div><div className="font-semibold">{formatCurrency(totals.grossSales)}</div></div>
          <div><div className="text-xs text-gray-500">Refunds</div><div className="font-semibold">{formatCurrency(totals.refunds)}</div></div>
          <div><div className="text-xs text-gray-500">Net Sales</div><div className="font-semibold text-teal-700">{formatCurrency(totals.netSales)}</div></div>
          <div><div className="text-xs text-gray-500">Items Sold</div><div className="font-semibold">{totals.itemsSold.toLocaleString()}</div></div>
          <div><div className="text-xs text-gray-500">Items Refunded</div><div className="font-semibold">{totals.itemsRefunded.toLocaleString()}</div></div>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
