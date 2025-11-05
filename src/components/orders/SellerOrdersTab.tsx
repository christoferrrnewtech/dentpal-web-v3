import React, { useMemo, useState, useEffect } from 'react';
import { Order } from '@/types/order';
import { Search, RefreshCcw, ShoppingCart } from 'lucide-react';
import { SUB_TABS, mapOrderToStage, LifecycleStage, TO_SHIP_SUB_TABS, ToShipStage } from './config';
import AllOrdersView from './views/AllOrdersView';
import UnpaidOrdersView from './views/UnpaidOrdersView';
import ToShipOrdersView from './views/ToShipOrdersView';
import ShippingOrdersView from './views/ShippingOrdersView';
import DeliveredOrdersView from './views/DeliveredOrdersView';
import FailedDeliveryOrdersView from './views/FailedDeliveryOrdersView';
import CancellationOrdersView from './views/CancellationOrdersView';
import ReturnRefundOrdersView from './views/ReturnRefundOrdersView';
import OrdersService from '@/services/orders';

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
  // New: to-ship sub-tab state
  const [toShipSubTab, setToShipSubTab] = useState<ToShipStage>('to-pack');

  // Reset to first page when filters or tab change
  useEffect(() => { setPage(1); }, [activeSubTab, dateFrom, dateTo]);

  // Reset to-ship sub-tab when switching to to-ship
  useEffect(() => {
    if (activeSubTab === 'to-ship') {
      setToShipSubTab('to-pack');
    }
  }, [activeSubTab]);

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

  // Counts for to-ship sub-tabs
  const countsByToShipSubTab = useMemo(() => {
    const toShipOrders = dateFilteredOrders.filter(o => mapOrderToStage(o) === 'to-ship');
    const base: Record<ToShipStage, number> = { 'to-pack': 0, 'to-arrangement': 0, 'to-hand-over': 0 };
    toShipOrders.forEach(o => {
      const stage = o.fulfillmentStage || 'to-pack';
      base[stage as ToShipStage] += 1;
    });
    return base;
  }, [dateFilteredOrders]);

  const filtered = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      // text query filter
      const q = (query || '').trim().toLowerCase();
      if (q) {
        const hay = [o.id, o.barcode, o.itemsBrief, o.customer?.name]
          .filter(Boolean)
          .map(v => String(v).toLowerCase());
        if (!hay.some(h => h.includes(q))) return false;
      }
      // stage filter
      if (activeSubTab !== 'all' && !SUB_TABS.find(t => t.id === activeSubTab)?.predicate(o)) return false;
      // to-ship sub-stage filter
      if (activeSubTab === 'to-ship') {
        const stage = o.fulfillmentStage || 'to-pack';
        if (stage !== toShipSubTab) return false;
      }
      return true;
    });
  }, [dateFilteredOrders, activeSubTab, toShipSubTab, query]);

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

  // Handle moving order to arrangement
  const handleMoveToArrangement = async (order: Order) => {
    try {
      await OrdersService.updateFulfillmentStage(order.id, 'to-arrangement');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to move order to arrangement:', error);
      alert('Failed to move order. Please try again.');
    }
  };

  // Handle moving order to hand over
  const handleMoveToHandOver = async (order: Order) => {
    try {
      await OrdersService.updateFulfillmentStage(order.id, 'to-hand-over');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to move order to hand over:', error);
      alert('Failed to move order. Please try again.');
    }
  };

  // Handle confirming handover -> move to Shipping (processing)
  const handleConfirmHandover = async (order: Order) => {
    try {
      await OrdersService.updateOrderStatus(order.id, 'processing');
      // After confirming handover, navigate to Shipping tab
      setActiveSubTab('shipping');
      setPage(1);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to confirm handover:', error);
      alert('Failed to confirm handover. Please try again.');
    }
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
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID, buyer, tracking no., or items"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>
      
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

      {activeSubTab === 'to-ship' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm mt-4">
          <div className="flex flex-wrap gap-2">
            {TO_SHIP_SUB_TABS.map(subTab => {
              const isActive = subTab.id === toShipSubTab;
              return (
                <button
                  key={subTab.id}
                  onClick={() => setToShipSubTab(subTab.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60
                    ${isActive ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-300'}
                  `}
                >
                  <span>{subTab.label}</span>
                  <span className={`ml-2 inline-flex items-center justify-center text-[11px] font-semibold rounded-full px-1.5 min-w-[1.25rem]
                    ${isActive ? 'bg-white/20 text-white' : 'bg-orange-200 text-orange-800'}`}>{countsByToShipSubTab[subTab.id]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-orange-600">
            Manage orders through packing, arrangement, and handover stages.
          </div>
        </div>
      )}

      {activeSubTab === 'to-ship'
        ? (
          <ToShipOrdersView
            orders={pagedOrders}
            onSelectOrder={handleSelectOrder}
            onMoveToArrangement={handleMoveToArrangement}
            onMoveToHandOver={handleMoveToHandOver}
            onConfirmHandover={handleConfirmHandover}
          />
        )
        : (!loading && pagedOrders.length === 0
          ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">No orders found</p>
              <p className="text-gray-500">Try adjusting filters or date range to see orders here</p>
            </div>
          )
          : (
            <ActiveView orders={pagedOrders} onSelectOrder={handleSelectOrder} />
          )
        )}

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
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  <div className="space-y-3 md:col-span-1">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="text-sm font-medium text-gray-900">{selectedOrder.timestamp}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Buyer</div>
                      <div className="text-sm font-medium text-gray-900">{selectedOrder.customer.name || '—'}</div>
                      <div className="text-xs text-gray-500">{selectedOrder.customer.contact || ''}</div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden mb-4">
                  <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                    <div className="col-span-1" />
                    <div className="col-span-6">Product</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Price</div>
                  </div>
                  <div className="divide-y">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-3">
                          <div className="col-span-1 flex items-center">
                            <input type="checkbox" className="h-4 w-4 text-teal-600 border-gray-300 rounded" />
                          </div>
                          <div className="col-span-6 flex items-start gap-3 min-w-0">
                            {/* Optional thumbnail for better UX */}
                            {(it as any).image || it.imageUrl ? (
                              <img src={(it as any).image || it.imageUrl!} alt={it.name} className="w-10 h-10 rounded-md object-cover border border-gray-200 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{it.name || 'Unnamed product'}</div>
                              <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                {it.sku ? `SKU: ${it.sku}` : (it as any).variation ? `Variant: ${(it as any).variation}` : it.productId ? `Product: ${it.productId}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 text-center text-sm text-gray-700">{it.quantity}</div>
                          <div className="col-span-3 text-right text-sm text-gray-900">{typeof it.price !== 'undefined' ? `${selectedOrder.currency || 'PHP'} ${it.price}` : ''}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-600">{selectedOrder.itemsBrief || `${selectedOrder.orderCount} item(s)`}</div>
                    )}
                  </div>
                </div>

                {/* Package above Total Amount */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">Package</div>
                    <div className="text-sm text-gray-500 mt-1">{selectedOrder.package.size}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Amount</div>
                    <div className="text-lg font-semibold">{selectedOrder.currency || 'PHP'} {selectedOrder.total != null ? selectedOrder.total : ''}</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      if (activeSubTab === 'to-ship' && selectedOrder) {
                        await handleMoveToArrangement(selectedOrder);
                        setToShipSubTab('to-arrangement');
                      }
                      printSummary(selectedOrder);
                      setDetailsOpen(false);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  Print
                </button>
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
