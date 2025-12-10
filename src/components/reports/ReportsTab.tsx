import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Download, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import OrdersService from '@/services/orders';
import type { Order } from '@/types/order';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query as fsQuery, where, getDocs } from 'firebase/firestore';
// New: exports for XLSX/PDF
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Known Category ID -> Name (from Inventory/AddProduct)
const CATEGORY_ID_TO_NAME: Record<string, string> = {
  EsDNnmc72LZNMHk3SmeV: 'Disposables',
  PtqCTLGduo6vay2umpMY: 'Dental Equipment',
  iXMJ7vcFIcMjQBVfIHZp: 'Consumables',
  z5BRrsDIy92XEK1PzdM4: 'Equipment',
};

// Aggregated row shape for the grid
interface ReportRow {
  key: string; // group key (Item/Category/Brand/Payment Type)
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

type SubTab = 'item' | 'category' | 'brand' | 'paymentType' | 'invoice';

type Basis = 'accrual' | 'cash';

const formatCurrency = (n: number) => `₱${(n || 0).toLocaleString()}`;

// Choose which date field to use based on basis
const getOrderDate = (o: Order, basis: Basis): string => {
  if (basis === 'cash') return (o as any).paidAt || o.timestamp; // fallback to accrual if missing
  return o.timestamp;
};
// NEW: robust date object resolver supporting Firestore Timestamp, ISO strings, and YYYY-MM-DD
const getOrderDateObj = (o: Order, basis: Basis): Date | null => {
  const raw: any = basis === 'cash' ? (o as any).paidAt || o.timestamp : o.timestamp;
  if (!raw) return null;
  try {
    // Firestore Timestamp
    if (raw && typeof raw.toDate === 'function') return raw.toDate();
    const s = String(raw);
    // ISO date-time or epoch
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    // YYYY-MM-DD fallback
    const d2 = new Date(`${s}T00:00:00`);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  } catch { return null; }
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
    case 'to_ship':
    case 'processing':
    case 'completed':
      return 'Paid';
    default: return 'Unknown';
  }
};

const ReportsTab: React.FC = () => {
  // Use auth once at component scope (Rules of Hooks)
  const { isAdmin, uid, isSubAccount, parentId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<SubTab>('item');
  const [basis, setBasis] = useState<Basis>('accrual');
  const [dateRange, setDateRange] = useState<string>('last_30');
  const [query, setQuery] = useState<string>('');
  // NEW: Sales Invoice custom date range picker (admin-dashboard style)
  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
  const invoiceDateDropdownRef = useRef<HTMLDivElement | null>(null);
  const [invoiceCalendarMonth, setInvoiceCalendarMonth] = useState<Date>(new Date());
  const [invoiceRange, setInvoiceRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const toISO = (d: Date | null) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10) : '';
  const daysInMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const firstWeekday = (month: Date) => new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 0=Sun
  const isInRange = (day: Date) => {
    const { start, end } = invoiceRange;
    if (!start) return false;
    if (start && !end) return day.getTime() === start.getTime();
    if (start && end) return day >= start && day <= end;
    return false;
  };
  const handleDayClick = (day: Date) => {
    setInvoiceRange(prev => {
      if (!prev.start || (prev.start && prev.end)) return { start: day, end: null };
      if (day < prev.start) return { start: day, end: prev.start };
      return { start: prev.start, end: day };
    });
  };
  const applyInvoiceRange = () => {
    const start = invoiceRange.start; const end = invoiceRange.end || invoiceRange.start;
    if (!start || !end) return;
    const from = toISO(start);
    const to = toISO(end as Date);
    console.log('[InvoiceRange] Apply clicked:', { from, to, start, end });
    // Use custom token for filtering below
    setDateRange(`custom:${from}:${to}`);
    setShowInvoiceDatePicker(false);
  };
  useEffect(() => {
    if (!showInvoiceDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (!invoiceDateDropdownRef.current) return;
      if (!invoiceDateDropdownRef.current.contains(e.target as Node)) setShowInvoiceDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInvoiceDatePicker]);

  // Product category cache for Sales by Category
  const [categoryByPid, setCategoryByPid] = useState<Record<string, string>>({});
  const [categoryByName, setCategoryByName] = useState<Record<string, string>>({});
  // New: Product brand cache for Sales by Brand
  const [brandByPid, setBrandByPid] = useState<Record<string, string>>({});
  const [brandByName, setBrandByName] = useState<Record<string, string>>({});

  // New: Categories (by name) and subcategories from subcollection 'subCategory'
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [subsByCategory, setSubsByCategory] = useState<Record<string, string[]>>({});
  const [subsIdToNameByCategory, setSubsIdToNameByCategory] = useState<Record<string, Record<string, string>>>({});
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');

  // Map Category ID -> display name (merged from docs and local constants)
  const catIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    Object.entries(CATEGORY_ID_TO_NAME).forEach(([id, nm]) => { if (!map[id]) map[id] = nm; });
    return map;
  }, [categories]);

  // Subscribe to orders based on role
  useEffect(() => {
    let unsub = () => {};
    if (isAdmin) unsub = OrdersService.listenAll((rows) => { setOrders(rows); });
    else if (isSubAccount && parentId) unsub = OrdersService.listenBySeller(parentId, (rows) => { setOrders(rows); });
    else if (uid) unsub = OrdersService.listenBySeller(uid, (rows) => { setOrders(rows); });
    return () => { unsub(); };
  }, [isAdmin, uid, isSubAccount, parentId]);

  // Load Categories and their Subcategories from Firestore (subcollection 'subCategory')
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catSnap = await getDocs(collection(db, 'Category'));
        const catRows = catSnap.docs.map(d => {
          const data: any = d.data();
          const name = String(
            data?.categoryName || data?.CategoryName ||
            data?.name || data?.category || data?.Category || data?.title || data?.displayName || data?.label ||
            CATEGORY_ID_TO_NAME[d.id] || d.id
          ).trim();
          return { id: d.id, name };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const subsEntriesNames: Array<[string, string[]]> = [];
        const subsEntriesIdToName: Array<[string, Record<string, string>]> = [];
        await Promise.all(catRows.map(async (c) => {
          try {
            const subSnap = await getDocs(collection(db, 'Category', c.id, 'subCategory'));
            const idToName: Record<string, string> = {};
            const names: string[] = subSnap.docs
              .map(sd => {
                const s: any = sd.data();
                const nm = String(
                  s?.subCategoryName || s?.subcategoryName ||
                  s?.name || s?.title || s?.displayName || s?.label ||
                  s?.subCategory || s?.Subcategory || s?.SubCategory || sd.id
                ).trim();
                idToName[sd.id] = nm;
                return nm;
              })
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b));
            subsEntriesNames.push([c.name, names]);
            subsEntriesIdToName.push([c.name, idToName]);
          } catch {
            subsEntriesNames.push([c.name, []]);
            subsEntriesIdToName.push([c.name, {}]);
          }
        }));
        if (!cancelled) {
          setCategories(catRows);
          setSubsByCategory(Object.fromEntries(subsEntriesNames));
          setSubsIdToNameByCategory(Object.fromEntries(subsEntriesIdToName));
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setSubsByCategory({});
          setSubsIdToNameByCategory({});
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Selected Category name (for label-based fallback match)
  const selectedCategoryNameMemo = useMemo(() => {
    const c = categories.find(x => x.name === selectedCategoryName);
    return c?.name || '';
  }, [categories, selectedCategoryName]);

  // Filter by date range and basis (extended to support custom range)
  const filteredOrders = useMemo(() => {
    const ordersByPreset = (rng: string) => orders.filter(o => withinRange(getOrderDate(o, basis), rng));
    if (dateRange?.startsWith('custom:')) {
      const parts = dateRange.split(':');
      const from = parts[1]; const to = parts[2] || parts[1];
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59.999`);
      return orders.filter(o => {
        const d = getOrderDateObj(o, basis);
        return !!d && d >= fromDate && d <= toDate;
      });
    }
    return ordersByPreset(dateRange);
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

  // New: Fetch Product brands for items in view (by productId)
  useEffect(() => {
    const ids = new Set<string>();
    filteredOrders.forEach(o => (o.items || []).forEach(it => { if (it.productId) ids.add(String(it.productId)); }));
    const missing = Array.from(ids).filter(id => !(id in brandByPid));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(missing.map(async (id) => {
        try {
          const pSnap = await getDoc(doc(db, 'Product', id));
          const p: any = pSnap.exists() ? pSnap.data() : undefined;
          const label = String(p?.brand || p?.Brand || p?.brandName || p?.manufacturer || p?.Manufacturer || p?.vendorName || p?.sellerName || '').trim();
          updates[id] = label || 'Unknown Brand';
        } catch {
          updates[id] = 'Unknown Brand';
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setBrandByPid(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, brandByPid]);

  // New: resolve brand by Product name when productId is missing
  useEffect(() => {
    const names = new Set<string>();
    filteredOrders.forEach(o => (o.items || []).forEach(it => {
      const pid = it.productId ? String(it.productId) : '';
      if (!pid && it.name) {
        const n = String(it.name).trim();
        if (n && !(n in brandByName)) names.add(n);
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
          const label = String(first?.brand || first?.Brand || first?.brandName || first?.manufacturer || first?.Manufacturer || first?.vendorName || first?.sellerName || '').trim();
          updates[n] = label || 'Unknown Brand';
        } catch {
          updates[n] = 'Unknown Brand';
        }
      }));
      if (!cancelled && Object.keys(updates).length) {
        setBrandByName(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, brandByName]);

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
        const labelDirectRaw = it.category && String(it.category).trim();
        const labelByPid = pid ? (categoryByPid[pid] || '') : '';
        const labelByNameFallback = (!pid && it.name) ? (categoryByName[String(it.name).trim()] || '') : '';
        const itCatId = it.categoryId ? String(it.categoryId) : '';
        const itSubRaw = it.subcategory ? String(it.subcategory).trim() : '';

        // Normalize category label to name
        let resolvedLabel = 'Uncategorized';
        if (itCatId) {
          resolvedLabel = catIdToName[itCatId] || CATEGORY_ID_TO_NAME[itCatId] || labelDirectRaw || labelByPid || labelByNameFallback || 'Uncategorized';
        } else if (labelDirectRaw && catIdToName[labelDirectRaw]) {
          // label stored as ID
          resolvedLabel = catIdToName[labelDirectRaw] || 'Uncategorized';
        } else {
          resolvedLabel = String(labelDirectRaw || labelByPid || labelByNameFallback || '').trim() || 'Uncategorized';
        }

        // Apply dropdown filters when active is category
        if (selectedCategoryName !== 'ALL') {
          if (resolvedLabel !== selectedCategoryName) return; // skip
        }

        // Normalize subcategory to name using the resolved category
        const subMap = subsIdToNameByCategory[resolvedLabel] || {};
        const itSubNorm = subMap[itSubRaw] || itSubRaw;
        if (selectedSubcategory !== 'ALL') {
          if (!itSubNorm || itSubNorm !== selectedSubcategory) return; // skip
        }

        const key = resolvedLabel;
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
  }, [filteredOrders, categoryByPid, categoryByName, selectedCategoryName, selectedSubcategory, catIdToName, subsIdToNameByCategory]);

  // Payment Type aggregation
  const paymentTypeRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    const paidStatuses: Order['status'][] = ['to_ship', 'processing', 'completed'];
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

  // Sales by Brand aggregation
  const brandRows: ReportRow[] = useMemo(() => {
    const byKey = new Map<string, ReportRow>();
    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const pid = it.productId ? String(it.productId) : '';
        const byPid = pid ? (brandByPid[pid] || '') : '';
        const byName = (!pid && it.name) ? (brandByName[String(it.name).trim()] || '') : '';
        const label = String(byPid || byName || '').trim() || 'Unknown Brand';
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
  }, [filteredOrders, brandByPid, brandByName]);

  // Data rows by active tab
  const data = useMemo(() => {
    const base = active === 'item' ? itemRows
      : active === 'category' ? categoryRows
      : active === 'brand' ? brandRows
      : paymentTypeRows;
    const rows = active === 'category'
      ? base // dropdown filters already applied in aggregation
      : base.filter(r => !query || r.key.toLowerCase().includes(query.toLowerCase()));
    return rows;
  }, [active, itemRows, categoryRows, brandRows, paymentTypeRows, query]);

  const firstColHeader = active === 'item' ? 'Item'
    : active === 'category' ? 'Category'
    : active === 'brand' ? 'Brand'
    : 'Payment Type';

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
    if (active === 'brand') {
      const cols = ['Brand', 'Gross Sales', 'Refunds', 'Net Sales'];
      const header = cols.join(',');
      const body = data.map(r => [r.key, r.grossSales, r.refunds, r.netSales].join(',')).join('\n');
      const csv = header + '\n' + body;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sales-by-brand-${dateRange}-${basis}.csv`; a.click();
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

  const exportXlsxBrand = async () => {
    const rows = data; // filtered by query already
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sales by Brand');
    ws.addRow(['Brand', 'Gross Sales', 'Refunds', 'Net Sales']);
    rows.forEach((r) => ws.addRow([r.key, r.grossSales, r.refunds, r.netSales]));
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `sales-by-brand-${dateRange}-${basis}.xlsx`);
  };

  const exportPdfBrand = () => {
    const rows = data; // filtered by query already
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Brand', 'Gross Sales', 'Refunds', 'Net Sales']],
      body: rows.map(r => [r.key, formatCurrency(r.grossSales), formatCurrency(r.refunds), formatCurrency(r.netSales)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [13, 148, 136] },
      startY: 14,
    });
    doc.save(`sales-by-brand-${dateRange}-${basis}.pdf`);
  };

  // Export consolidated Sales Invoice PDF for the selected range
  const exportSalesInvoicePdf = () => {
    // Build invoice meta
    const now = new Date();
    const periodLabel = 'To Ship Orders (Testing)';
    // TEMP: Use the same filtered orders from invoiceOrders (to_ship only)
    const ordersInRange = invoiceOrders;
    const lineItems: Array<{ name: string; qty: number; price: number; total: number; }>=[];
    let subtotal = 0;
    ordersInRange.forEach((o) => {
      const lines = (o.items || []).map(it => ({
        name: String(it.name || 'Item'),
        qty: Number(it.quantity || 0),
        price: Number(it.price || 0),
        total: Number(it.price || 0) * Number(it.quantity || 0),
      }));
      lines.forEach(l => { lineItems.push(l); subtotal += l.total; });
    });
    const totalPaymentProcessingFee = ordersInRange.reduce((s, o) => s + Number(o.feesBreakdown?.paymentProcessingFee || 0), 0);
    const totalPlatformFee = ordersInRange.reduce((s, o) => s + Number(o.feesBreakdown?.platformFee || 0), 0);
    const totalShippingCharge = ordersInRange.reduce((s, o) => s + Number(o.summary?.sellerShippingCharge || 0), 0);
    const netPayout = ordersInRange.reduce((s, o) => s + Number(o.payout?.netPayoutToSeller || 0), 0);

    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('DentPal Sales Invoice Summary', 14, 16);
    doc.setFontSize(9);
    doc.text(`Period: ${periodLabel}`, 14, 22);
    doc.text(`Generated: ${now.toISOString().slice(0,19).replace('T',' ')}`, 14, 26);

    autoTable(doc, {
      head: [['Item', 'Qty', 'Price', 'Line Total']],
      body: lineItems.map(li => [li.name, String(li.qty), `₱${li.price.toLocaleString()}`, `₱${li.total.toLocaleString()}`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [13, 148, 136] },
      startY: 32,
    });

    const y = (doc as any).lastAutoTable?.finalY || 32;
    doc.setFontSize(10);
    doc.text('Summary', 14, y + 8);
    autoTable(doc, {
      head: [['Subtotal', 'Payment Processing Fee', 'Platform Fee', 'Shipping Charge', 'Net Payout']],
      body: [[
        `₱${subtotal.toLocaleString()}`,
        `₱${totalPaymentProcessingFee.toLocaleString()}`,
        `₱${totalPlatformFee.toLocaleString()}`,
        `₱${totalShippingCharge.toLocaleString()}`,
        `₱${netPayout.toLocaleString()}`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [243, 244, 246], textColor: [17,24,39] },
      startY: y + 10,
    });

    doc.save(`sales-invoice-summary-${periodLabel.replace(/\s+/g,'-')}.pdf`);
  };

  // TEMP: Filter shipping orders (for testing layout)
  const invoiceEligible = (o: Order) => {
    // Include shipping, to_ship, processing, completed
    return ['shipping', 'to_ship', 'processing', 'completed'].includes(o.status);
  };

  // Invoice orders: showing shipping/to_ship/processing/completed (ignoring date range for now)
  const invoiceOrders = useMemo(() => {
    return orders.filter(invoiceEligible);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'item', label: 'Sales by Item' },
          { id: 'category', label: 'Sales by Category' },
          { id: 'brand', label: 'Sales by Brand' },
          { id: 'paymentType', label: 'Sales by Payment Type' },
          // NEW: Sales Invoice Summary tab
          { id: 'invoice' as any, label: 'Sales Invoice Summary' },
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
        {/* Basis retained for existing tabs; hidden on invoice */}
        {active !== ('invoice' as any) && (
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
        )}
        {active === ('invoice' as any) ? (
          <div className="flex items-center gap-2" title="Select a custom date range for the sales invoice.">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div ref={invoiceDateDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowInvoiceDatePicker(v => !v)}
                aria-haspopup="dialog"
                aria-expanded={showInvoiceDatePicker}
                className="p-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 flex items-center justify-between min-w-[220px]"
              >
                <span className="truncate pr-2">{dateRange?.startsWith('custom:') ? (()=>{ const [_, f, t] = dateRange.split(':'); return `${f} → ${t || f}`; })() : 'Select range'}</span>
                <span className={`text-[11px] transition-transform ${showInvoiceDatePicker ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {showInvoiceDatePicker && (
                <div className="absolute left-0 mt-2 z-30 w-[300px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
                  {/* Calendar header */}
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setInvoiceCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">◀</button>
                    <div className="text-xs font-medium text-gray-700">{invoiceCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
                    <button type="button" onClick={() => setInvoiceCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">▶</button>
                  </div>
                  {/* Weekday labels */}
                  <div className="grid grid-cols-7 text-[10px] font-medium text-gray-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}</div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {Array.from({ length: firstWeekday(invoiceCalendarMonth) }).map((_,i) => <div key={'spacer'+i} />)}
                    {Array.from({ length: daysInMonth(invoiceCalendarMonth) }).map((_,i) => {
                      const day = new Date(invoiceCalendarMonth.getFullYear(), invoiceCalendarMonth.getMonth(), i+1);
                      const selectedStart = invoiceRange.start && day.getTime() === invoiceRange.start.getTime();
                      const selectedEnd = invoiceRange.end && day.getTime() === invoiceRange.end.getTime();
                      const inRangeLocal = isInRange(day);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          className={`h-7 rounded-md flex items-center justify-center transition border text-gray-700 ${selectedStart || selectedEnd ? 'bg-teal-600 text-white border-teal-600 font-semibold' : inRangeLocal ? 'bg-teal-100 border-teal-200' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                          title={toISO(day)}
                        >{i+1}</button>
                      );
                    })}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button type="button" onClick={() => { setInvoiceRange({ start: null, end: null }); setDateRange(''); }} className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100">Clear</button>
                    <div className="flex gap-2">
                      <button type="button" onClick={applyInvoiceRange} disabled={!invoiceRange.start} className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-40">Apply</button>
                      <button type="button" onClick={() => setShowInvoiceDatePicker(false)} className="text-[11px] px-3 py-1 rounded-md border bg-white hover:bg-gray-100">Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // existing preset selector for other tabs
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
        )}
        {/* Search hidden on invoice tab */}
        {active !== ('invoice' as any) && (
          <div className="flex items-center gap-2" title="Filter rows by the first column value.">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${firstColHeader.toLowerCase()}`}
              className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Existing exports */}
          {active !== ('invoice' as any) && (
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => exportCsv()} title="Export the current summary table as CSV.">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          {active === ('invoice' as any) && (
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => exportSalesInvoicePdf()} title="Download consolidated Sales Invoice PDF for the selected period.">
              <Download className="w-4 h-4" /> Export Invoice PDF
            </button>
          )}
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => {/* no-op, data is live */}} title="Data is live; click to re-evaluate filters.">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Data grid or invoice preview */}
      {active === ('invoice' as any) ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700 mb-2">Sales Invoice Summary</div>
          <div className="text-xs text-gray-500 mb-4">{dateRange?.startsWith('custom:') ? (()=>{ const [_, f, t] = dateRange.split(':'); return `Period: ${f} → ${t || f}`; })() : 'Please select a date range to view invoice data'}</div>
          <div className="overflow-auto border border-gray-100 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Use filtered invoice orders (paid status + date range)
                  const ordersSrc = invoiceOrders;
                  const rows: Array<{ name: string; qty: number; price: number; total: number; }> = [];
                  let subtotal = 0;
                  ordersSrc.forEach(o => {
                    (o.items || []).forEach(it => {
                      const qty = Number(it.quantity || 0);
                      const price = Number(it.price || 0);
                      const total = qty * price;
                      rows.push({ name: String(it.name || 'Item'), qty, price, total });
                      subtotal += total;
                    });
                  });
                  if (rows.length === 0) return (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                      {dateRange?.startsWith('custom:') 
                        ? 'No paid orders in the selected date range.' 
                        : 'No paid orders found. Please select a date range.'}
                    </td></tr>
                  );
                  return (
                    <>
                      {rows.map((r, idx) => (
                        <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                          <td className="px-3 py-2">{r.qty.toLocaleString()}</td>
                          <td className="px-3 py-2">{formatCurrency(r.price)}</td>
                          <td className="px-3 py-2 font-semibold text-teal-700">{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-3 py-2 text-right font-medium" colSpan={3}>Subtotal</td>
                        <td className="px-3 py-2 font-semibold">{formatCurrency(subtotal)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              {active === 'paymentType' ? (
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 py-2" title="Payment instrument or channel">Payment Type</th>
                  <th className="px-3 py-2" title="Number of successful payment transactions on paid statuses">Payment Transactions</th>
                  <th className="px-3 py-2" title="Sum of amounts for payment transactions">Payment Amount</th>
                  <th className="px-3 py-2" title="Number of refund transactions (orders with refund status)">Refund Transactions</th>
                  <th className="px-3 py-2" title="Sum of refund amounts">Refund Amount</th>
                  <th className="px-3 py-2" title="Payment Amount minus Refund Amount">Net Sales</th>
                </tr>
              ) : active === 'brand' ? (
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2" title="Sum of line totals">Gross Sales</th>
                  <th className="px-3 py-2" title="Sum of refunded amounts">Refunds</th>
                  <th className="px-3 py-2" title="Gross Sales minus Refunds">Net Sales</th>
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
              {active === 'brand' ? (
                data.map((r, idx) => (
                  <tr key={r.key} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.key}</td>
                    <td className="px-3 py-2">{formatCurrency(r.grossSales)}</td>
                    <td className="px-3 py-2">{formatCurrency(r.refunds)}</td>
                    <td className="px-3 py-2 font-semibold text-teal-700">{formatCurrency(r.netSales)}</td>
                  </tr>
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
              {data.length === 0 && (
                <tr>
                  <td colSpan={active === 'brand' ? 4 : (active === 'paymentType') ? 6 : 6} className="px-3 py-6 text-center text-sm text-gray-500">No data for the selected range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals footer */}
      {active === ('invoice' as any) ? null : (
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
