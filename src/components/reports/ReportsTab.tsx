import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { OrdersService } from '@/services/orders';
import type { Order } from '@/types/order';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query as fsQuery, where, getDocs } from 'firebase/firestore';

// Known Category ID -> Name (from Inventory/AddProduct)
const CATEGORY_ID_TO_NAME: Record<string, string> = {
  EsDNnmc72LZNMHk3SmeV: 'Disposables',
  PtqCTLGduo6vay2umpMY: 'Dental Equipment',
  iXMJ7vcFIcMjQBVfIHZp: 'Consumables',
  z5BRrsDIy92XEK1PzdM4: 'Equipment',
};

// Aggregated row shape for the grid
interface ReportRow {
  key: string; // group key (Item name or Payment Type)
  itemsSold: number;
  grossSales: number;
  itemsRefunded: number;
  refunds: number;
  netSales: number;
}

// New: rows for generic amount-only aggregations
interface AmountRow { key: string; amount: number; count?: number }

// Extended subtabs
// item, payment, category, paymentType are existing
// New: tax, discount, shipFees, refundsDetail, settlements, byCustomer, bySeller, byRegion, timeSeries
// timeSeries will produce rows keyed by date bucket

type SubTab = 'item' | 'payment' | 'category' | 'paymentType' | 'tax' | 'discounts' | 'shipFees' | 'refundsDetail' | 'settlements' | 'byCustomer' | 'bySeller' | 'byRegion' | 'timeSeries';

type Basis = 'accrual' | 'cash';

const formatCurrency = (n: number) => `₱${(n || 0).toLocaleString()}`;

// Choose which date field to use based on basis
const getOrderDate = (o: Order, basis: Basis): string => {
  if (basis === 'cash') return o.paidAt || o.timestamp; // fallback to accrual if missing
  return o.timestamp;
};

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
  const [basis, setBasis] = useState<Basis>('accrual');
  const [dateRange, setDateRange] = useState<string>('last_30');
  const [query, setQuery] = useState('');

  // Product category cache for Sales by Category
  const [categoryByPid, setCategoryByPid] = useState<Record<string, string>>({});
  const [categoryByName, setCategoryByName] = useState<Record<string, string>>({});

  // Subscribe to orders based on role
  useEffect(() => {
    let unsub = () => {};
    if (isAdmin) unsub = OrdersService.listenAll(setOrders);
    else if (uid) unsub = OrdersService.listenBySeller(uid, setOrders);
    return () => unsub();
  }, [isAdmin, uid]);

  // Filter by date range and basis
  const filteredOrders = useMemo(() => {
    return orders.filter(o => withinRange(getOrderDate(o, basis), dateRange));
  }, [orders, dateRange, basis]);

  // Fetch Product categories for items in view (by productId)
  useEffect(() => {
    const ids = new Set<string>();
    filteredOrders.forEach(o => (o.items || []).forEach(it => { if (it.productId) ids.add(String(it.productId)); }));
    const missing = Array.from(ids).filter(id => !(id in categoryByPid));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(missing.map(async (id) => {
        try {
          const pSnap = await getDoc(doc(db, 'Product', id));
          const p: any = pSnap.exists() ? pSnap.data() : undefined;
          let label = String(p?.category || p?.Category || '').trim();
          let catId = p?.categoryID || p?.categoryId || p?.CategoryID || p?.CategoryId;
          if (!label && catId) {
            // Try map ID locally first
            label = CATEGORY_ID_TO_NAME[String(catId)] || '';
          }
          if (!label && catId) {
            try {
              const cSnap = await getDoc(doc(db, 'Category', String(catId)));
              const c: any = cSnap.exists() ? cSnap.data() : undefined;
              label = String(c?.name || c?.title || c?.displayName || '').trim();
            } catch {}
          }
          updates[id] = label || 'Uncategorized';
        } catch {
          updates[id] = 'Uncategorized';
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setCategoryByPid(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, categoryByPid]);

  // Fallback: resolve category by Product name when productId is missing
  useEffect(() => {
    const names = new Set<string>();
    filteredOrders.forEach(o => (o.items || []).forEach(it => {
      const pid = it.productId ? String(it.productId) : '';
      const hasDirect = !!(it.category && String(it.category).trim());
      if (!pid && !hasDirect && it.name) {
        const n = String(it.name).trim();
        if (n && !(n in categoryByName)) names.add(n);
      }
    }));
    const missing = Array.from(names);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(missing.map(async (n) => {
        try {
          const q = fsQuery(collection(db, 'Product'), where('name', '==', n));
          const snap = await getDocs(q);
          const first = snap.docs[0]?.data() as any | undefined;
          let label = String(first?.category || first?.Category || '').trim();
          let catId = first?.categoryID || first?.categoryId || first?.CategoryID || first?.CategoryId;
          if (!label && catId) {
            label = CATEGORY_ID_TO_NAME[String(catId)] || '';
          }
          if (!label && catId) {
            try {
              const cSnap = await getDoc(doc(db, 'Category', String(catId)));
              const c: any = cSnap.exists() ? cSnap.data() : undefined;
              label = String(c?.name || c?.title || c?.displayName || '').trim();
            } catch {}
          }
          updates[n] = label || 'Uncategorized';
        } catch {
          updates[n] = 'Uncategorized';
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setCategoryByName(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, categoryByName]);

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

  const categoryRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const pid = it.productId ? String(it.productId) : '';
        const labelDirect = it.category && String(it.category).trim();
        const labelByPid = pid ? (categoryByPid[pid] || '') : '';
        const labelByName = (!pid && it.name) ? (categoryByName[String(it.name).trim()] || '') : '';
        const label = String(labelDirect || labelByPid || labelByName || '').trim() || 'Uncategorized';
        const key = label;
        const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
        const qty = it.quantity || 0;
        const amt = (it.price || 0) * qty;
        r.itemsSold += qty;
        r.grossSales += amt;
        if (refundStatuses.includes(o.status)) {
          r.itemsRefunded += qty;
          r.refunds += amt;
        }
        byKey.set(key, r);
      });
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders, categoryByPid, categoryByName]);

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

  // Payment Type aggregation
  const paymentTypeRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    const paidStatuses: Order['status'][] = ['to-ship', 'processing', 'completed'];
    filteredOrders.forEach(o => {
      const key = o.paymentType || 'Unknown';
      const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
      const amount = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      if (paidStatuses.includes(o.status)) {
        // reuse fields: itemsSold => payment tx count, grossSales => payment amount
        r.itemsSold += 1;
        r.grossSales += amount;
      }
      if (refundStatuses.includes(o.status)) {
        // reuse fields: itemsRefunded => refund tx count, refunds => refund amount
        r.itemsRefunded += 1;
        r.refunds += amount;
      }
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  // New aggregations
  const taxRows: AmountRow[] = useMemo(() => {
    const amt = filteredOrders.reduce((s, o) => s + (o.tax || 0), 0);
    return [{ key: 'Tax', amount: amt }];
  }, [filteredOrders]);

  const discountRows: AmountRow[] = useMemo(() => {
    const amt = filteredOrders.reduce((s, o) => s + (o.discount || 0), 0);
    return [{ key: 'Discounts', amount: amt }];
  }, [filteredOrders]);

  const shipFeeRows: AmountRow[] = useMemo(() => {
    const ship = filteredOrders.reduce((s, o) => s + (o.shipping || 0), 0);
    const fees = filteredOrders.reduce((s, o) => s + (o.fees || 0), 0);
    return [
      { key: 'Shipping', amount: ship },
      { key: 'Fees', amount: fees },
    ];
  }, [filteredOrders]);

  const refundsDetailRows = useMemo(() => {
    // List each refunded order with amounts and dates
    const rows = filteredOrders.filter(o => refundStatuses.includes(o.status)).map(o => ({
      orderId: o.id,
      customer: o.customer?.name || '',
      amount: o.total || 0,
      refundedAt: o.refundedAt || '',
      paymentType: o.paymentType || '',
    }));
    return rows;
  }, [filteredOrders]);

  const settlementsRows = useMemo(() => {
    // Cash-basis: sum paid orders by payment type within dateRange (using paidAt)
    const byKey = new Map<string, { amount: number; count: number }>();
    orders.filter(o => o.paidAt && withinRange(o.paidAt, dateRange)).forEach(o => {
      const key = o.paymentType || 'Unknown';
      const prev = byKey.get(key) || { amount: 0, count: 0 };
      const amount = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      byKey.set(key, { amount: prev.amount + amount, count: prev.count + 1 });
    });
    return Array.from(byKey.entries()).map(([key, v]) => ({ key, amount: v.amount, count: v.count }));
  }, [orders, dateRange]);

  const byCustomerRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      const key = o.customer?.name || 'Unknown Customer';
      const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
      const qty = o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
      const amt = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      r.itemsSold += qty; r.grossSales += amt;
      if (refundStatuses.includes(o.status)) { r.itemsRefunded += qty; r.refunds += amt; }
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  const bySellerRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      const key = o.sellerName || (o.sellerIds && o.sellerIds[0]) || 'Unknown Seller';
      const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
      const qty = o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
      const amt = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      r.itemsSold += qty; r.grossSales += amt;
      if (refundStatuses.includes(o.status)) { r.itemsRefunded += qty; r.refunds += amt; }
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  const byRegionRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      const rgn = o.region;
      const key = rgn?.province ? `${rgn.province}${rgn.municipality ? ' - ' + rgn.municipality : ''}` : (rgn?.municipality || 'Unknown Region');
      const r = byKey.get(key) || { key, itemsSold: 0, grossSales: 0, itemsRefunded: 0, refunds: 0, netSales: 0 };
      const qty = o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
      const amt = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      r.itemsSold += qty; r.grossSales += amt;
      if (refundStatuses.includes(o.status)) { r.itemsRefunded += qty; r.refunds += amt; }
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).map(r => ({ ...r, netSales: Math.max(0, r.grossSales - r.refunds) }));
  }, [filteredOrders]);

  const timeSeriesRows = useMemo(() => {
    // Bucket by date (based on basis)
    const byKey = new Map<string, { sales: number; refunds: number }>();
    filteredOrders.forEach(o => {
      const date = getOrderDate(o, basis);
      const prev = byKey.get(date) || { sales: 0, refunds: 0 };
      const amt = typeof o.total === 'number' ? o.total : (o.items?.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);
      if (refundStatuses.includes(o.status)) {
        byKey.set(date, { sales: prev.sales, refunds: prev.refunds + amt });
      } else {
        byKey.set(date, { sales: prev.sales + amt, refunds: prev.refunds });
      }
    });
    return Array.from(byKey.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, amount: v.sales - v.refunds }));
  }, [filteredOrders, basis]);

  const data = useMemo(() => {
    const base = active === 'item' ? itemRows
      : active === 'payment' ? paymentRows
      : active === 'category' ? categoryRows
      : active === 'paymentType' ? paymentTypeRows
      : active === 'tax' ? taxRows.map(r => ({ key: r.key, itemsSold: 0, grossSales: r.amount, itemsRefunded: 0, refunds: 0, netSales: r.amount }))
      : active === 'discounts' ? discountRows.map(r => ({ key: r.key, itemsSold: 0, grossSales: r.amount, itemsRefunded: 0, refunds: 0, netSales: r.amount }))
      : active === 'shipFees' ? shipFeeRows.map(r => ({ key: r.key, itemsSold: 0, grossSales: r.amount, itemsRefunded: 0, refunds: 0, netSales: r.amount }))
      : active === 'byCustomer' ? byCustomerRows
      : active === 'bySeller' ? bySellerRows
      : active === 'byRegion' ? byRegionRows
      : active === 'settlements' ? settlementsRows.map(r => ({ key: r.key, itemsSold: r.count || 0, grossSales: r.amount, itemsRefunded: 0, refunds: 0, netSales: r.amount }))
      : timeSeriesRows.map(r => ({ key: r.key, itemsSold: 0, grossSales: r.amount, itemsRefunded: 0, refunds: 0, netSales: r.amount }));
    const rows = base.filter(r => !query || r.key.toLowerCase().includes(query.toLowerCase()));
    return rows;
  }, [active, itemRows, paymentRows, categoryRows, paymentTypeRows, taxRows, discountRows, shipFeeRows, byCustomerRows, bySellerRows, byRegionRows, settlementsRows, timeSeriesRows, query]);

  const firstColHeader = active === 'item' ? 'Item'
    : active === 'category' ? 'Category'
    : active === 'payment' ? 'Payment Type'
    : active === 'paymentType' ? 'Payment Type'
    : active === 'byCustomer' ? 'Customer'
    : active === 'bySeller' ? 'Seller'
    : active === 'byRegion' ? 'Region'
    : active === 'timeSeries' ? 'Date'
    : 'Metric';

  // Totals for footer
  const totals = useMemo(() => {
    const grossSales = sumGrossSales(filteredOrders);
    const refunds = sumRefunds(filteredOrders);
    const netSales = Math.max(0, grossSales - refunds);
    const itemsSold = sumItemsSold(filteredOrders);
    const itemsRefunded = sumItemsRefunded(filteredOrders);
    return { grossSales, refunds, netSales, itemsSold, itemsRefunded };
  }, [filteredOrders]);

  const totalsPaymentType = useMemo(() => {
    if (active !== 'paymentType') return null;
    const counts = paymentTypeRows.reduce((acc, r) => {
      acc.payTx += r.itemsSold;
      acc.refundTx += r.itemsRefunded;
      acc.payAmt += r.grossSales;
      acc.refundAmt += r.refunds;
      return acc;
    }, { payTx: 0, refundTx: 0, payAmt: 0, refundAmt: 0 });
    return { ...counts, net: Math.max(0, counts.payAmt - counts.refundAmt) };
  }, [active, paymentTypeRows]);

  // Exporters
  const exportCsv = () => {
    if (active === 'paymentType') {
      const cols = ['Payment Type', 'Payment Transactions', 'Payment Amount', 'Refund Transactions', 'Refund Amount', 'Net Sales'];
      const header = cols.join(',');
      const body = data.map(r => [r.key, r.itemsSold, r.grossSales, r.itemsRefunded, r.refunds, r.netSales].join(',')).join('\n');
      const csv = header + '\n' + body;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `reports-${active}.csv`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
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

  const exportDetailedCsv = () => {
    // Line-level export
    const cols = ['orderId','date','basis','customerId','customerName','sellerId','paymentType','paymentTxnId','paidAt','refundedAt','itemName','sku','productId','category','categoryId','quantity','price','lineTotal','tax','discount','shipping','fees','COGS','grossMargin'];
    const header = cols.join(',');
    const lines: string[] = [];
    filteredOrders.forEach(o => {
      const date = getOrderDate(o, basis);
      const sellerId = o.sellerIds?.[0] || '';
      const common = [o.id, date, basis, o.customerId || '', o.customer?.name || '', sellerId, o.paymentType || '', o.paymentTxnId || '', o.paidAt || '', o.refundedAt || ''];
      (o.items || []).forEach(it => {
        const qty = it.quantity || 0;
        const price = it.price || 0;
        const lineTotal = qty * price;
        const row = [...common, it.name || '', it.sku || '', it.productId || '', it.category || '', it.categoryId || '', qty, price, lineTotal, o.tax || 0, o.discount || 0, o.shipping || 0, o.fees || 0, o.cogs || 0, o.grossMargin || (o.total != null && o.cogs != null ? o.total - o.cogs : 0)];
        lines.push(row.join(','));
      });
      if (!o.items || o.items.length === 0) {
        const row = [...common, '', '', '', '', '', 0, 0, 0, o.tax || 0, o.discount || 0, o.shipping || 0, o.fees || 0, o.cogs || 0, o.grossMargin || (o.total != null && o.cogs != null ? o.total - o.cogs : 0)];
        lines.push(row.join(','));
      }
    });
    const csv = header + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reports-detailed-${basis}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'item', label: 'Sales by Item' },
          { id: 'category', label: 'Sales by Category' },
          { id: 'payment', label: 'Sales by Payment' },
          { id: 'paymentType', label: 'Sales by Payment Type' },
          { id: 'tax', label: 'Tax Summary' },
          { id: 'discounts', label: 'Discounts' },
          { id: 'shipFees', label: 'Shipping & Fees' },
          { id: 'refundsDetail', label: 'Refunds Detail' },
          { id: 'settlements', label: 'Settlements (Cash)' },
          { id: 'byCustomer', label: 'Sales by Customer' },
          { id: 'bySeller', label: 'Sales by Seller' },
          { id: 'byRegion', label: 'Sales by Region' },
          { id: 'timeSeries', label: 'Time Series' },
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
        <div className="flex items-center gap-2" title="Choose Accrual (order date) or Cash (paid date) basis for date filtering and exports.">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value as Basis)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="accrual">Accrual basis</option>
            <option value="cash">Cash basis</option>
          </select>
        </div>
        <div className="flex items-center gap-2" title="Limit the report to a time window.">
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
        <div className="flex items-center gap-2" title="Filter rows by the first column value.">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${firstColHeader.toLowerCase()}`}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => exportCsv()} title="Export the current summary table as CSV.">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => exportDetailedCsv()} title="Export detailed line-level CSV including IDs and accounting fields.">
            <Download className="w-4 h-4" /> Export Detailed CSV
          </button>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => {/* no-op, data is live */}} title="Data is live; click to re-evaluate filters.">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Data grid */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            {active === 'refundsDetail' ? (
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2" title="Order ID that was refunded">Order ID</th>
                <th className="px-3 py-2" title="Customer name for the refunded order">Customer</th>
                <th className="px-3 py-2" title="Refunded amount">Refund Amount</th>
                <th className="px-3 py-2" title="Date the refund was recognized">Refunded At</th>
                <th className="px-3 py-2" title="Payment method/channel">Payment Type</th>
              </tr>
            ) : active === 'paymentType' || active === 'settlements' ? (
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2" title="Payment instrument or channel">Payment Type</th>
                <th className="px-3 py-2" title={active === 'settlements' ? 'Number of settled transactions (paidAt within range)' : 'Number of successful payment transactions on paid statuses'}>{active === 'settlements' ? 'Settled Transactions' : 'Payment Transactions'}</th>
                <th className="px-3 py-2" title={active === 'settlements' ? 'Sum of settled amounts (cash-basis)' : 'Sum of amounts for payment transactions'}>{active === 'settlements' ? 'Settled Amount' : 'Payment Amount'}</th>
                <th className="px-3 py-2" title="Number of refund transactions (orders with refund status)">Refund Transactions</th>
                <th className="px-3 py-2" title="Sum of refund amounts">Refund Amount</th>
                <th className="px-3 py-2" title="Payment Amount minus Refund Amount">Net Sales</th>
              </tr>
            ) : (
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2">{firstColHeader}</th>
                <th className="px-3 py-2" title="Total item quantities sold">Items Sold</th>
                <th className="px-3 py-2" title="Sum of line totals">Gross Sales</th>
                <th className="px-3 py-2" title="Quantities on refunded orders">Items Refunded</th>
                <th className="px-3 py-2" title="Sum of refunded amounts">Refunds</th>
                <th className="px-3 py-2" title="Gross Sales minus Refunds">Net Sales</th>
              </tr>
            )}
          </thead>
          <tbody>
            {active === 'refundsDetail' ? (
              // Specialized table for refunds detail
              (refundsDetailRows.length ? refundsDetailRows.map((r: any, idx: number) => (
                <tr key={r.orderId} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.orderId}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2">{r.refundedAt || '-'}</td>
                  <td className="px-3 py-2">{r.paymentType || '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No refunds found.</td></tr>
              ))
            ) : (
              data.map((r, idx) => (
                <tr key={r.key} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.key}</td>
                  <td className="px-3 py-2">{r.itemsSold.toLocaleString()}</td>
                  <td className="px-3 py-2">{formatCurrency(r.grossSales)}</td>
                  <td className="px-3 py-2">{r.itemsRefunded.toLocaleString()}</td>
                  <td className="px-3 py-2">{formatCurrency(r.refunds)}</td>
                  <td className="px-3 py-2 font-semibold text-teal-700">{formatCurrency(r.netSales)}</td>
                </tr>
              ))
            )}
            {data.length === 0 && active !== 'refundsDetail' && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No data for the selected range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      {active === 'paymentType' && totalsPaymentType ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><div className="text-xs text-gray-500">Payment Transactions</div><div className="font-semibold">{totalsPaymentType.payTx.toLocaleString()}</div></div>
            <div><div className="text-xs text-gray-500">Payment Amount</div><div className="font-semibold">{formatCurrency(totalsPaymentType.payAmt)}</div></div>
            <div><div className="text-xs text-gray-500">Refund Transactions</div><div className="font-semibold">{totalsPaymentType.refundTx.toLocaleString()}</div></div>
            <div><div className="text-xs text-gray-500">Refund Amount</div><div className="font-semibold">{formatCurrency(totalsPaymentType.refundAmt)}</div></div>
            <div><div className="text-xs text-gray-500">Net Sales</div><div className="font-semibold text-teal-700">{formatCurrency(totalsPaymentType.net)}</div></div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div title="Sum of line totals before refunds"><div className="text-xs text-gray-500">Gross Sales</div><div className="font-semibold">{formatCurrency(totals.grossSales)}</div></div>
            <div title="Total refund amounts in the range"><div className="text-xs text-gray-500">Refunds</div><div className="font-semibold">{formatCurrency(totals.refunds)}</div></div>
            <div title="Gross minus Refunds"><div className="text-xs text-gray-500">Net Sales</div><div className="font-semibold text-teal-700">{formatCurrency(totals.netSales)}</div></div>
            <div title="Sum of item quantities sold"><div className="text-xs text-gray-500">Items Sold</div><div className="font-semibold">{totals.itemsSold.toLocaleString()}</div></div>
            <div title="Quantities on refunded orders"><div className="text-xs text-gray-500">Items Refunded</div><div className="font-semibold">{totals.itemsRefunded.toLocaleString()}</div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
