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
  // New: details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState<null | 'id' | 'barcode'>(null);

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

  // When a row asks to show details, open dialog and also bubble if parent provided handler
  const handleSelectOrder = (o: Order) => {
    setSelectedOrder(o);
    setDetailsOpen(true);
    onSelectOrder?.(o);
  };

  // Accessibility: close on Escape
  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailsOpen]);

  const statusClasses = (s: Order['status']) => {
    switch (s) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'to-ship': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'processing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'failed-delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'returned':
      case 'refunded':
      case 'return_refund':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const stepOrder: LifecycleStage[] = ['unpaid','to-ship','shipping','delivered'];

  const copyToClipboard = async (text: string, which: 'id' | 'barcode') => {
    try { await navigator.clipboard.writeText(text); setCopied(which); setTimeout(()=> setCopied(null), 1200); } catch {}
  };

  const printSummary = (o: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Order ${o.id}</title></head><body style="font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:24px;">`);
    w.document.write(`<h2 style="margin:0 0 12px;">Order #${o.id}</h2>`);
    w.document.write(`<div>Date: ${o.timestamp}</div>`);
    w.document.write(`<div>Status: ${o.status}</div>`);
    w.document.write(`<div>Tracking No.: ${o.barcode}</div>`);
    if (Array.isArray(o.items) && o.items.length) {
      w.document.write('<h3 style="margin:16px 0 6px;">Items</h3>');
      w.document.write('<table style="width:100%; border-collapse:collapse;">');
      w.document.write('<thead><tr><th align="left" style="border-bottom:1px solid #e5e7eb; padding:6px 0;">Name</th><th align="right" style="border-bottom:1px solid #e5e7eb; padding:6px 0;">Qty</th><th align="right" style="border-bottom:1px solid #e5e7eb; padding:6px 0;">Price</th></tr></thead>');
      w.document.write('<tbody>');
      o.items.forEach(it => {
        w.document.write(`<tr><td style="padding:6px 0; border-bottom:1px solid #f3f4f6;">${it.name}</td><td align="right" style="padding:6px 0; border-bottom:1px solid #f3f4f6;">${it.quantity}</td><td align="right" style="padding:6px 0; border-bottom:1px solid #f3f4f6;">${it.price ?? ''}</td></tr>`);
      });
      w.document.write('</tbody></table>');
    } else if (o.itemsBrief) {
      w.document.write(`<div>Items: ${o.itemsBrief}</div>`);
    }
    if (o.total != null) w.document.write(`<div style="margin-top:10px;">Total: ${o.currency || 'PHP'} ${o.total}</div>`);
    w.document.write(`<div>Buyer: ${o.customer.name || ''}</div>`);
    w.document.write(`<div>Contact: ${o.customer.contact || ''}</div>`);
    w.document.write(`</body></html>`);
    w.document.close();
    w.print();
  };

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
      <ActiveView orders={pagedOrders} onSelectOrder={handleSelectOrder} />

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

      {/* Details Dialog */}
      {detailsOpen && selectedOrder && (() => {
        const stg = mapOrderToStage(selectedOrder);
        const isTerminal = ['failed-delivery','cancellation','return-refund'].includes(stg);
        const activeIdx = stepOrder.indexOf(stg as any);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setDetailsOpen(false)} />
            <div role="dialog" aria-modal="true" className="relative z-10 w-[95vw] max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Order</div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">#{selectedOrder.id}</h3>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusClasses(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => copyToClipboard(selectedOrder.id,'id')}>{copied==='id' ? 'Copied' : 'Copy ID'}</button>
                    <button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => copyToClipboard(selectedOrder.barcode,'barcode')}>{copied==='barcode' ? 'Copied' : 'Copy barcode'}</button>
                    <button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setDetailsOpen(false)}>Close</button>
                  </div>
                </div>
                {/* Progress */}
                <div className="mt-3">
                  {isTerminal ? (
                    <div className="text-xs text-gray-600">This order is in a terminal state: <span className="font-medium capitalize">{selectedOrder.status}</span>.</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {stepOrder.map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${i <= activeIdx ? 'bg-teal-600' : 'bg-gray-300'}`} />
                          <div className={`text-[11px] ${i <= activeIdx ? 'text-teal-700' : 'text-gray-500'}`}>{s.replace('-', ' ')}</div>
                          {i < stepOrder.length - 1 && <div className={`mx-2 h-px w-8 ${i < activeIdx ? 'bg-teal-200' : 'bg-gray-200'}`} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Left: Buyer & Timing */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="text-sm font-medium text-gray-900">{selectedOrder.timestamp}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Buyer</div>
                      <div className="text-sm font-medium text-gray-900">{selectedOrder.customer.name || '—'}</div>
                      <div className="text-xs text-gray-500">{selectedOrder.customer.contact || ''}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Tracking No.</div>
                      <div className="text-sm text-gray-900 break-all">{selectedOrder.barcode}</div>
                    </div>
                  </div>

                  {/* Middle: Items & Media */}
                  <div className="space-y-3 md:col-span-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">Items</div>
                        <div className="text-xs text-gray-500">{selectedOrder.currency || 'PHP'}</div>
                      </div>
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        <div className="mt-1 -mx-1.5 overflow-hidden border border-gray-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-2 py-1.5 text-gray-600 font-medium">Name</th>
                                <th className="text-right px-2 py-1.5 text-gray-600 font-medium">Qty</th>
                                <th className="text-right px-2 py-1.5 text-gray-600 font-medium">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrder.items.map((it, idx) => (
                                <tr key={idx} className="border-t border-gray-100">
                                  <td className="px-2 py-1.5 text-gray-900">{it.name}</td>
                                  <td className="px-2 py-1.5 text-right text-gray-900">{it.quantity}</td>
                                  <td className="px-2 py-1.5 text-right text-gray-900">{it.price ?? ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{selectedOrder.itemsBrief || `${selectedOrder.orderCount} item(s)`}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedOrder.imageUrl ? (
                        <img src={selectedOrder.imageUrl} alt="Product" className="w-20 h-20 rounded-lg object-cover border border-gray-200 shadow-sm" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amounts */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Total Amount</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedOrder.currency || 'PHP'} {selectedOrder.total != null ? selectedOrder.total : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Package</div>
                      <div className="text-sm text-gray-900">{selectedOrder.package.size}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => printSummary(selectedOrder)}>Print</button>
                <button className="text-xs px-3 py-1.5 rounded-md border border-teal-600 text-teal-700 hover:bg-teal-50" onClick={() => setDetailsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OrderTab;
