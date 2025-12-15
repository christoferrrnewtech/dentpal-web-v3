import { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RevenueChart from "@/components/dashboard/RevenueChart";
import Booking from "@/pages/Booking";
import ConfirmationTab from "@/components/confirmation/ConfirmationTab";
import WithdrawalTab from "@/components/withdrawal/WithdrawalTab";
import SellerWithdrawalTab from "@/components/withdrawal/SellerWithdrawalTab";
import AccessTab from "@/components/access/AccessTab";
import ImagesTab from "@/components/images/ImagesTab";
import UsersTab from "@/components/users/UsersTab";
import OrderTab from '@/components/orders/SellerOrdersTab';
import InventoryTab from '@/components/inventory/InventoryTab';
import ProductQCTab from '@/components/admin/ProductQCTab';
import { Order } from "@/types/order";
import { DollarSign, Users, ShoppingCart, TrendingUp, Filter, Download } from "lucide-react";
// Add permission-aware auth hook
import { useAuth } from "@/hooks/use-auth";
import SellerProfileTab from '@/components/profile/SellerProfileTab';
import ReportsTab from '@/components/reports/ReportsTab';
import OrdersService from '@/services/orders';
import AddProduct from '@/pages/AddProduct'; // New
import NotificationsTab from '@/components/notifications/NotificationsTab';
import { useLocation, useNavigate } from 'react-router-dom';
import WarrantyManager from '@/pages/admin/WarrantyManager';
import CategoryManager from '@/pages/admin/CategoryManager';
import { getProvinces as getPhProvinces, getCitiesByProvince as getPhCities, getCitiesByProvinceAsync as getPhCitiesAsync } from '../lib/phLocations';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface DashboardProps {
  user: { name?: string; email: string };
  onLogout: () => void;
}

// Lazy address API loader (provinces & cities only)
let _addressApiCache: any | null = null;
const getAddressApi = async () => {
  if (_addressApiCache) return _addressApiCache;
  const mod: any = await import('select-philippines-address');
  const api = {
    regions: mod.regions || mod.default?.regions,
    provinces: mod.provinces || mod.default?.provinces,
    cities: mod.cities || mod.default?.cities,
    barangays: mod.barangays || mod.default?.barangays,
  };
  if (!api.regions || !api.provinces || !api.cities) {
    throw new Error('select-philippines-address API not available');
  }
  _addressApiCache = api;
  return api as {
    regions: () => Promise<any[]>;
    provinces: (regionCode: string) => Promise<any[]>;
    cities: (provinceCode: string) => Promise<any[]>;
  };
};

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { hasPermission, loading: authLoading } = useAuth();
  const { isAdmin } = useAuth();
  const { uid, isSubAccount, parentId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // New: seller dashboard UI state
  const [showTutorial, setShowTutorial] = useState(false);
  const [sellerFilters, setSellerFilters] = useState({ dateRange: 'last-30', brand: 'all', subcategory: 'all', location: 'all', paymentType: 'all' });
  // Admin filters (date picker range, province, city, seller/shop name)
  const [adminFilters, setAdminFilters] = useState<{ dateFrom: string; dateTo: string; province: string; city: string; seller: string }>({ dateFrom: '', dateTo: '', province: 'all', city: 'all', seller: 'all' });
  // Date range picker state (moved back after refactor)
  const [adminCalendarMonth, setAdminCalendarMonth] = useState<Date>(new Date());
  const [adminRange, setAdminRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [showAdminDatePicker, setShowAdminDatePicker] = useState(false);
  const adminDateDropdownRef = useRef<HTMLDivElement | null>(null);
  // Dynamic province & city lists (Philippines)
  const [phProvinces, setPhProvinces] = useState<Array<{ code: string; name: string }>>([]);
  const [phCities, setPhCities] = useState<Array<{ code: string; name: string; provinceCode: string }>>([]);
  // Admin sellers list for filtering & export table
  const [adminSellers, setAdminSellers] = useState<Array<{ uid: string; name?: string; shopName?: string; storeName?: string }>>([]);
  // Admin metrics from Firebase (orders)
  const [adminMetrics, setAdminMetrics] = useState<{ totalOrders: number; deliveredOrders: number; shippedOrders: number }>({ totalOrders: 0, deliveredOrders: 0, shippedOrders: 0 });
  // Admin city selection: allow multi-select via checkboxes when a province is chosen
  const [adminSelectedCityCodes, setAdminSelectedCityCodes] = useState<Set<string>>(new Set());
  // Admin City dropdown popover state
  const adminCityDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showAdminCityDropdown, setShowAdminCityDropdown] = useState(false);
  // Export table column visibility state (admin)
  const [exportColumnVisibility, setExportColumnVisibility] = useState<Record<string, boolean>>({
    seller: true,
    gross: true,
    avg: true,
    tx: true,
    logistic: true,
    payment: true,
    inquiry: true,
    orderSummary: true, // NEW: Order Summary column (moved to last)
  });
  const columnLabels: Record<string, string> = {
    seller: 'Seller Store',
    gross: 'Gross Sale',
    avg: 'Average Order',
    tx: 'Total Transaction',
    logistic: 'Logistic Fee',
    payment: 'Payment Fee',
    inquiry: 'Platform Fee',
    orderSummary: 'Order Summary', // NEW (moved to last)
  };
  const visibleColumnKeys = Object.keys(exportColumnVisibility).filter(k => exportColumnVisibility[k]);
  const [showExportColumnMenu, setShowExportColumnMenu] = useState(false);
  const exportColumnMenuRef = useRef<HTMLDivElement | null>(null);
  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  // Order Summary Modal state
  const [showOrderSummaryModal, setShowOrderSummaryModal] = useState(false);
  const [selectedSellerForOrders, setSelectedSellerForOrders] = useState<{ uid: string; name: string } | null>(null);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  // Track which orders have expanded item details
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!showExportColumnMenu) return;
    const handler = (e: MouseEvent) => {
      if (!exportColumnMenuRef.current) return;
      if (!exportColumnMenuRef.current.contains(e.target as Node)) setShowExportColumnMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportColumnMenu]);
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);
  const toISO = (d: Date | null) => d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10) : '';
  const daysInMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const firstWeekday = (month: Date) => new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 0=Sun
  const isInRange = (day: Date) => {
    const { start, end } = adminRange;
    if (!start) return false;
    if (start && !end) return day.getTime() === start.getTime();
    if (start && end) return day >= start && day <= end;
    return false;
  };
  const handleDayClick = (day: Date) => {
    setAdminRange(prev => {
      if (!prev.start || (prev.start && prev.end)) return { start: day, end: null };
      if (day < prev.start) return { start: day, end: prev.start };
      return { start: prev.start, end: day };
    });
  };
  const applyRange = () => {
    setAdminFilters(f => ({ ...f, dateFrom: toISO(adminRange.start), dateTo: toISO(adminRange.end || adminRange.start) }));
  };
  const applyPreset = (preset: 'today' | '7' | '30') => {
    const today = new Date();
    const end = today;
    let start = today;
    if (preset === '7') start = new Date(today.getTime() - 6*86400000);
    if (preset === '30') start = new Date(today.getTime() - 29*86400000);
    setAdminRange({ start, end });
    setAdminCalendarMonth(new Date(end.getFullYear(), end.getMonth(), 1));
    setAdminFilters(f => ({ ...f, dateFrom: toISO(start), dateTo: toISO(end) }));
  };

  // State moved up so memoized selectors can depend on it safely
  const [confirmationOrders, setConfirmationOrders] = useState<Order[]>([
    {
      id: "DP-2024-005",
      orderCount: 3,
      barcode: "2345678901",
      timestamp: "2024-09-09T08:30:00Z",
      customer: { name: "Perfect Smile Dental", contact: "+63 917 123 4567" },
      package: { size: "medium" as const, dimensions: "15cm × 10cm × 8cm", weight: "0.7kg" },
      priority: "urgent" as const,
      status: "processing" as const
    },
    {
      id: "DP-2024-006",
      orderCount: 1,
      barcode: "3456789012",
      timestamp: "2024-09-09T09:15:00Z",
      customer: { name: "Bright Teeth Clinic", contact: "+63 917 234 5678" },
      package: { size: "small" as const, dimensions: "10cm × 8cm × 5cm", weight: "0.3kg" },
      priority: "priority" as const,
      status: "processing" as const
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived: normalize and compute options/filtered/metrics so UI updates consistently
  const productOptions = useMemo(() => {
    return Array.from(
      new Set(
        (confirmationOrders || [])
          .flatMap(o => (o.items || []).map(it => (it.name || '').trim()).filter(Boolean))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [confirmationOrders]);

  const subcategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        (confirmationOrders || [])
          .flatMap(o => (o.items || []).map(it => (it.subcategory || '').trim()).filter(Boolean))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [confirmationOrders]);

  const paymentTypeOptions = useMemo(() => {
    return Array.from(
      new Set(
        (confirmationOrders || [])
          .map(o => (o.paymentType || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [confirmationOrders]);

  const isPaidStatus = (s: Order['status']) => ['to_ship','processing','completed','shipping'].includes(s);
  const getAmount = (o: Order) => typeof o.total === 'number' ? o.total : ((o.items || []).reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0) || 0);

  const filteredOrders = useMemo(() => {
    // Helpers inside memo to avoid re-creation elsewhere
    const parseDate = (s?: string) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const withinLastDays = (s?: string, key?: string) => {
      if (!s) return false;
      const d = parseDate(s);
      if (!d) return false;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let days = 30;
      switch (key) {
        case 'last-7': days = 7; break;
        case 'last-30': days = 30; break;
        case 'last-90': days = 90; break;
        case 'last-365': days = 365; break;
        default: days = 30;
      }
      const from = new Date(today.getTime() - (days - 1) * 86400000);
      return d >= from && d <= new Date(today.getTime() + 86399999);
    };

    const { dateRange, brand, subcategory, paymentType } = sellerFilters;

    return (confirmationOrders || []).filter(o => {
      if (!withinLastDays(o.timestamp, dateRange)) return false;
      if (paymentType !== 'all' && (String(o.paymentType || '').trim()) !== paymentType) return false;
      const items = o.items || [];
      const matchProduct = brand === 'all' || items.some(it => String(it.name || '') === brand);
      const matchSubcat = subcategory === 'all' || items.some(it => String(it.subcategory || '') === subcategory);
      if (!matchProduct || !matchSubcat) return false;
      // TODO: implement location filter when region data is standardized
      return true;
    });
  }, [confirmationOrders, sellerFilters]);

  const paidOrders = useMemo(() => filteredOrders.filter(o => isPaidStatus(o.status)), [filteredOrders]);

  const kpiMetrics = useMemo(() => {
    const receipts = paidOrders.length;
    const totalRevenue = paidOrders.reduce((s, o) => s + getAmount(o), 0);
    const avgSalePerTxn = receipts ? (totalRevenue / receipts) : 0;
    const logisticsDue = paidOrders.reduce((s, o) => s + (Number(o.shipping || 0) + Number(o.fees || 0)), 0);

    // Average timings from lifecycle timestamps
    const toMs = (s?: string) => {
      if (!s) return undefined;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : undefined;
    };
    const packDurations: number[] = [];
    const handoverDurations: number[] = [];
    paidOrders.forEach(o => {
      const created = toMs(o.createdAt || o.timestamp);
      const packed = toMs(o.packedAt);
      const handover = toMs(o.handoverAt);
      if (created != null && packed != null && packed >= created) packDurations.push((packed - created) / 60000);
      if (created != null && handover != null && handover >= created) handoverDurations.push((handover - created) / 60000);
    });
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : undefined;
    const avgPackMins = avg(packDurations) ?? 80;
    const avgHandoverMins = avg(handoverDurations) ?? 165;

    return { receipts, totalRevenue, avgSalePerTxn, logisticsDue, avgPackMins, avgHandoverMins };
  }, [paidOrders]);

  // Financial metrics calculated directly from orders (same as Reports tab)
  const financialMetrics = useMemo(() => {
    if (!confirmationOrders || confirmationOrders.length === 0) {
      return {
        totalPaymentProcessingFee: 0,
        totalPlatformFee: 0,
        totalShippingCharge: 0,
        totalNetPayout: 0,
        totalGross: 0,
      };
    }

    // Date filtering helper (same as Reports tab)
    const parseDate = (s?: string) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    
    const withinLastDays = (s?: string, key?: string) => {
      if (!s) return false;
      const d = parseDate(s);
      if (!d) return false;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let days = 30;
      switch (key) {
        case 'last-7': days = 7; break;
        case 'last-30': days = 30; break;
        case 'last-90': days = 90; break;
        case 'last-365': days = 365; break;
        default: days = 30;
      }
      const from = new Date(today.getTime() - (days - 1) * 86400000);
      return d >= from && d <= new Date(today.getTime() + 86399999);
    };

    let totalPaymentProcessingFee = 0;
    let totalPlatformFee = 0;
    let totalShippingCharge = 0;
    let totalNetPayout = 0;
    let totalGross = 0;
    let matchedOrders = 0;

    confirmationOrders.forEach((order: any) => {
      // Only count PAID orders (same as Reports tab)
      if (!isPaidStatus(order.status)) {
        return;
      }

      // Apply date range filter
      if (!withinLastDays(order.timestamp, sellerFilters.dateRange)) {
        return;
      }

      // Extract gross sales from order.summary.subtotal (same as Reports tab)
      const summary = order.summary || {};
      const subtotal = Number(summary.subtotal || 0);
      
      if (subtotal > 0) {
        totalGross += subtotal;
        matchedOrders++;
        
        // Extract fees
        const feesData = order.feesBreakdown || {};
        totalPaymentProcessingFee += Number(feesData.paymentProcessingFee || 0);
        totalPlatformFee += Number(feesData.platformFee || 0);
        
        // Extract shipping charge
        totalShippingCharge += Number(summary.sellerShippingCharge || 0);
        
        // Extract net payout
        const payout = order.payout || {};
        totalNetPayout += Number(payout.netPayoutToSeller || 0);
      }
    });

    console.log('[Dashboard] Financial metrics calculated:', {
      totalGross,
      totalNetPayout,
      totalPaymentProcessingFee,
      totalPlatformFee,
      totalShippingCharge,
      matchedOrders,
      totalOrders: confirmationOrders.length,
      dateRange: sellerFilters.dateRange,
    });

    return {
      totalPaymentProcessingFee,
      totalPlatformFee,
      totalShippingCharge,
      totalNetPayout,
      totalGross,
    };
  }, [confirmationOrders, sellerFilters.dateRange]);

  // Initialize active tab from query string (e.g., /?tab=inventory)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setActiveItem(tab);
    } catch {}
  }, []);

  // Sync active tab from query string whenever location changes
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab && tab !== activeItem) setActiveItem(tab);
    } catch {}
  }, [location.search]);

  // NEW: Keep URL query (?tab=...) in sync when activeItem changes to ensure future navigations take effect
  // Use a ref to prevent infinite loop
  const lastSyncedTab = useRef<string | null>(null);
  useEffect(() => {
    try {
      if (!activeItem) return;
      const params = new URLSearchParams(location.search);
      const current = params.get('tab');
      // Only navigate if activeItem changed AND it's different from URL AND we haven't just synced this value
      if (current !== activeItem && lastSyncedTab.current !== activeItem) {
        lastSyncedTab.current = activeItem;
        params.set('tab', activeItem);
        navigate({ pathname: location.pathname || '/', search: params.toString() }, { replace: true });
      }
    } catch {}
  }, [activeItem, location.pathname, location.search, navigate]);

  // Listen for custom navigation events from header actions (e.g., notifications)
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail?.tab && typeof detail.tab === 'string') {
        setActiveItem(detail.tab);
      }
    };
    window.addEventListener('dentpal:navigate' as any, onNavigate as any);
    return () => window.removeEventListener('dentpal:navigate' as any, onNavigate as any);
  }, []);

  // Map page ids to permission keys stored in Firestore
  const permissionByMenuId: Record<string, keyof ReturnType<typeof useAuth>["permissions"] | 'dashboard'> = {
    dashboard: "dashboard",
    profile: "dashboard",
    reports: "reports", // fixed: use reports permission
    booking: "bookings",
    confirmation: "confirmation",
    withdrawal: "withdrawal",
    access: "access",
    // NEW: Sub-accounts uses same component as Access but is always allowed for sellers (mapped to dashboard in Sidebar)
    'sub-accounts': 'dashboard',
    images: "images",
    users: "users",
    'seller-orders': 'seller-orders',
    inventory: 'inventory',
    'add-product': 'add-product',
    notifications: 'dashboard',
    // NEW: Admin QC tab permission mapping
    'product-qc': 'product-qc',
    // NEW: Warranty tab mapping (admin-only in UI; permission optional)
    'warranty': 'warranty',
    // NEW: Categories tab mapping (admin-only)
    'categories': 'categories',
  } as any;

  const isAllowed = (itemId: string) => {
    // Hide Profile tab for admin users only
    if (itemId === 'profile' && isAdmin) return false;
    return hasPermission((permissionByMenuId[itemId] || 'dashboard') as any);
  };

  // Ensure active tab is permitted; otherwise jump to first allowed
  useEffect(() => {
    if (authLoading) return;
    if (!isAllowed(activeItem)) {
      const order = [
        "dashboard",
        "profile",
        "reports",
        "booking",
        "seller-orders",
        "inventory",
        // Include admin QC tab in fallback order
        "product-qc",
        "confirmation",
        "withdrawal",
        "access",
        "images",
        "users",
      ];
      const firstAllowed = order.find((id) => isAllowed(id));
      if (firstAllowed) setActiveItem(firstAllowed);
    }
  }, [authLoading, activeItem]);

  // Handlers for confirmation actions
  const handleConfirmOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to confirm order
      console.log(`Confirming order ${orderId}`);
      // Remove from confirmation list (simulate move to completed)
      setConfirmationOrders(prev => prev.filter(order => order.id !== orderId));
      setError(null);
    } catch (err) {
      setError("Failed to confirm order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reject order
      console.log(`Rejecting order ${orderId}`);
      // Remove from confirmation list
      setConfirmationOrders(prev => prev.filter(order => order.id !== orderId));
      setError(null);
    } catch (err) {
      setError("Failed to reject order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfirmations = async (format: string) => {
    setLoading(true);
    try {
      // TODO: API call to export confirmations
      console.log(`Exporting confirmations as ${format}`);
      setError(null);
    } catch (err) {
      setError("Failed to export confirmations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveItem(tab);
  };

  // Handlers for withdrawal actions
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setLoading(true);
    try {
      // TODO: API call to approve withdrawal and initiate bank transfer
      console.log(`Approving withdrawal ${withdrawalId}`);
      // In real implementation, this would trigger bank transfer API
      setError(null);
    } catch (err) {
      setError("Failed to approve withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reject withdrawal
      console.log(`Rejecting withdrawal ${withdrawalId}`);
      setError(null);
    } catch (err) {
      setError("Failed to reject withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportWithdrawals = async (format: string) => {
    setLoading(true);
    try {
      // TODO: API call to export withdrawals
      console.log(`Exporting withdrawals as ${format}`);
      setError(null);
    } catch (err) {
      setError("Failed to export withdrawals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for access control actions
  const handleCreateUser = async (userData: any) => {
    setLoading(true);
    try {
      // TODO: API call to create user
      console.log(`Creating user:`, userData);
      setError(null);
    } catch (err) {
      setError("Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    setLoading(true);
    try {
      // TODO: API call to update user
      console.log(`Updating user ${userId}:`, userData);
      setError(null);
    } catch (err) {
      setError("Failed to update user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call to delete user
      console.log(`Deleting user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to delete user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for images management actions
  const handleUploadImages = async (files: File[], category: string) => {
    setLoading(true);
    try {
      // TODO: API call to upload images
      console.log(`Uploading ${files.length} images to ${category} category`);
      setError(null);
    } catch (err) {
      setError("Failed to upload images. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setLoading(true);
    try {
      // TODO: API call to delete image
      console.log(`Deleting image ${imageId}`);
      setError(null);
    } catch (err) {
      setError("Failed to delete image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handlers for users management actions
  const handleResetRewardPoints = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call to reset user reward points
      console.log(`Resetting reward points for user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to reset reward points. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationAdminPassword = async (userId: string) => {
    setLoading(true);
    try {
      // TODO: API call for admin password confirmation before user suspension
      console.log(`Admin password confirmation for user ${userId}`);
      setError(null);
    } catch (err) {
      setError("Failed to confirm admin password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async (format: 'csv' | 'pdf' | 'excel') => {
    setLoading(true);
    try {
      // TODO: API call to export users data
      console.log(`Exporting users as ${format.toUpperCase()}`);
      setError(null);
    } catch (err) {
      setError("Failed to export users data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Export seller metrics table as CSV
  const exportSellerMetricsCSV = () => {
    try {
      const headers = visibleColumnKeys.map(k => columnLabels[k]);
      const rows = adminSellersDisplayed.map(s => {
        const sellerOrders = confirmationOrders.filter(o => {
          const orderSellerIds = o.sellerIds || [];
          if (!orderSellerIds.includes(s.uid)) return false;
          
          // Date range filter
          if (adminFilters.dateFrom && adminFilters.dateTo) {
            const orderDate = o.timestamp ? o.timestamp.slice(0, 10) : '';
            if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) return false;
          }
          
          // Province filter - EXCLUDE orders without region data when filter is active
          if (adminFilters.province !== 'all') {
            if (!o.region || !o.region.province) {
              return false;
            }
            const orderProvinceCode = o.region.province;
            if (orderProvinceCode !== adminFilters.province) return false;
          }
          
          // City filter - EXCLUDE orders without region data when filter is active
          if (adminSelectedCityCodes.size > 0) {
            if (!o.region || !o.region.municipality) {
              return false;
            }
            const orderCity = o.region.municipality;
            const matchingCity = phCities.find(c => c.name === orderCity);
            if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) return false;
          }
          
          if (!isPaidStatus(o.status)) return false;
          return true;
        });
        const gross = sellerOrders.reduce((sum, o) => sum + (Number(o.summary?.subtotal) || 0), 0);
        const tx = sellerOrders.length;
        const avgOrder = tx > 0 ? gross / tx : 0;
        const logistic = sellerOrders.reduce((sum, o) => sum + (Number(o.summary?.sellerShippingCharge) || 0), 0);
        const payment = sellerOrders.reduce((sum, o) => sum + (Number(o.feesBreakdown?.paymentProcessingFee) || 0), 0);
        const inquiry = sellerOrders.reduce((sum, o) => sum + (Number(o.feesBreakdown?.platformFee) || 0), 0);
        const cellByKey: Record<string, any> = {
          seller: s.storeName || s.shopName || s.name || s.uid,
          gross: gross,
          avg: avgOrder,
          tx: tx,
          logistic: logistic,
          payment: payment,
          inquiry: inquiry,
        };
        return visibleColumnKeys.map(k => cellByKey[k]);
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `seller-metrics-${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (err) {
      console.error('CSV export failed:', err);
      setError('Failed to export CSV. Please try again.');
    }
  };

  // Export seller metrics table as PDF
  const exportSellerMetricsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Seller Metrics Report', 14, 15);
      
      // Add date range if available
      doc.setFontSize(10);
      const dateText = adminFilters.dateFrom 
        ? `Period: ${adminFilters.dateFrom} to ${adminFilters.dateTo}`
        : 'All time';
      doc.text(dateText, 14, 22);

      // Prepare table data
      const headers = visibleColumnKeys.map(k => columnLabels[k]);
      const rows = adminSellersDisplayed.map(s => {
        const sellerOrders = confirmationOrders.filter(o => {
          const orderSellerIds = o.sellerIds || [];
          if (!orderSellerIds.includes(s.uid)) return false;
          
          // Date range filter
          if (adminFilters.dateFrom && adminFilters.dateTo) {
            const orderDate = o.timestamp ? o.timestamp.slice(0, 10) : '';
            if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) return false;
          }
          
          // Province filter - skip if order has no region data
          if (adminFilters.province !== 'all') {
            if (o.region && o.region.province) {
              const orderProvinceCode = o.region.province;
              if (orderProvinceCode !== adminFilters.province) return false;
            }
            // If no region data, include the order
          }
          
          // City filter - skip if order has no region data
          if (adminSelectedCityCodes.size > 0) {
            if (o.region && o.region.municipality) {
              const orderCity = o.region.municipality;
              const matchingCity = phCities.find(c => c.name === orderCity);
              if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) return false;
            }
            // If no region data, include the order
          }
          
          if (!isPaidStatus(o.status)) return false;
          return true;
        });
        const gross = sellerOrders.reduce((sum, o) => sum + (Number(o.summary?.subtotal) || 0), 0);
        const tx = sellerOrders.length;
        const avgOrder = tx > 0 ? gross / tx : 0;
        const logistic = sellerOrders.reduce((sum, o) => sum + (Number(o.summary?.sellerShippingCharge) || 0), 0);
        const payment = sellerOrders.reduce((sum, o) => sum + (Number(o.feesBreakdown?.paymentProcessingFee) || 0), 0);
        const inquiry = sellerOrders.reduce((sum, o) => sum + (Number(o.feesBreakdown?.platformFee) || 0), 0);
        const cellByKey: Record<string, any> = {
          seller: s.storeName || s.shopName || s.name || s.uid,
          gross: gross,
          avg: avgOrder,
          tx: tx,
          logistic: logistic,
          payment: payment,
          inquiry: inquiry,
        };
        return visibleColumnKeys.map(k => typeof cellByKey[k] === 'number' ? cellByKey[k].toLocaleString() : cellByKey[k]);
      });

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [13, 148, 136] },
      });

      doc.save(`seller-metrics-${new Date().toISOString().slice(0,10)}.pdf`);
      setShowExportMenu(false);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Failed to export PDF. Please try again.');
    }
  };

  // Handler to open Order Summary modal for a seller
  const handleOpenOrderSummary = (seller: { uid: string; storeName?: string; shopName?: string; name?: string }) => {
    const sellerName = seller.storeName || seller.shopName || seller.name || seller.uid;
    
    // Filter orders for this seller with admin filters applied
    const filteredSellerOrders = confirmationOrders.filter(order => {
      // Must belong to this seller
      const orderSellerIds = order.sellerIds || [];
      if (!orderSellerIds.includes(seller.uid)) return false;
      
      // Apply admin filters
      // Date range filter
      if (adminFilters.dateFrom && adminFilters.dateTo) {
        const orderDate = order.timestamp ? order.timestamp.slice(0, 10) : '';
        if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) return false;
      }
      
      // Province filter - EXCLUDE orders without region data when filter is active
      if (adminFilters.province !== 'all') {
        if (!order.region || !order.region.province) {
          return false;
        }
        const orderProvinceCode = order.region.province;
        if (orderProvinceCode !== adminFilters.province) return false;
      }
      
      // City filter - EXCLUDE orders without region data when filter is active
      if (adminSelectedCityCodes.size > 0) {
        if (!order.region || !order.region.municipality) {
          return false;
        }
        const orderCity = order.region.municipality;
        const matchingCity = phCities.find(c => c.name === orderCity);
        if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) return false;
      }
      
      return true;
    });
    
    setSelectedSellerForOrders({ uid: seller.uid, name: sellerName });
    setSellerOrders(filteredSellerOrders);
    setShowOrderSummaryModal(true);
  };

  console.log("Dashboard component rendered for user:", user);

  const getPageContent = () => {
    switch (activeItem) {
      case "dashboard":
        if (!isAllowed("dashboard")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        // Seller-first dashboard (non-admin)
        if (!isAdmin) {
          const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });
          const fmtMins = (mins: number) => { const h = Math.floor(mins / 60); const m = mins % 60; return `${h}h ${m}m`; };
          return (
            <div className="space-y-6">
              {/* Title + Tutorial */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Dashboard</h3>
                <button onClick={() => setShowTutorial(true)} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm">Tutorial</button>
              </div>

              {/* KPI cards - Row 1: Primary Sales Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Gross Sales</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{currency.format(financialMetrics.totalGross)}</div>
                  <div className="mt-1 text-xs text-gray-500">Total subtotal from all orders</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Net Payout</div>
                  <div className="mt-2 text-2xl font-bold text-green-600">{currency.format(financialMetrics.totalNetPayout)}</div>
                  <div className="mt-1 text-xs text-gray-500">After fees & charges</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Number of receipts</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{kpiMetrics.receipts.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-gray-500">Paid orders</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Average sale per transaction</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{currency.format(kpiMetrics.avgSalePerTxn)}</div>
                  <div className="mt-1 text-xs text-gray-500">Last {sellerFilters.dateRange.replace('last-','')} days</div>
                </div>
              </div>

              {/* KPI cards - Row 2: Fees & Charges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Payment Processing Fee</div>
                  <div className="mt-2 text-2xl font-bold text-red-600">{currency.format(financialMetrics.totalPaymentProcessingFee)}</div>
                  <div className="mt-1 text-xs text-gray-500">Total payment gateway fees</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Platform Fee</div>
                  <div className="mt-2 text-2xl font-bold text-red-600">{currency.format(financialMetrics.totalPlatformFee)}</div>
                  <div className="mt-1 text-xs text-gray-500">Total platform commission</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Shipping Charge</div>
                  <div className="mt-2 text-2xl font-bold text-orange-600">{currency.format(financialMetrics.totalShippingCharge)}</div>
                  <div className="mt-1 text-xs text-gray-500">Seller portion of shipping</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Average completion time</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{`${fmtMins(kpiMetrics.avgPackMins)} / ${fmtMins(kpiMetrics.avgHandoverMins)}`}</div>
                  <div className="mt-1 text-xs text-gray-500">To pack / To handover</div>
                </div>
              </div>

              {/* Horizontal Filters (below KPIs, above Revenue) */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-3">Filters</div>
                <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 gap-4">
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select date</label>
                    <div ref={sellerDateDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSellerDatePicker(v => !v)}
                        aria-haspopup="dialog"
                        aria-expanded={showSellerDatePicker}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="truncate pr-2">
                          {sellerRange.start ? `${toISO(sellerRange.start)} → ${toISO(sellerRange.end || sellerRange.start)}` : sellerFilters.dateRange.replace('last-','Last ')}
                        </span>
                        <span className={`text-[11px] transition-transform ${showSellerDatePicker ? 'rotate-180' : ''}`}>⌄</span>
                      </button>
                      {showSellerDatePicker && (
                        <div className="absolute left-0 mt-2 z-30 w-[280px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
                          {/* Presets */}
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => applySellerPreset('today')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Today</button>
                            <button onClick={() => applySellerPreset('7')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 7 days</button>
                            <button onClick={() => applySellerPreset('30')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 30 days</button>
                            {sellerRange.start && (
                              <span className="text-[10px] text-gray-500 ml-auto">{toISO(sellerRange.start)} → {toISO(sellerRange.end || sellerRange.start)}</span>
                            )}
                          </div>
                          {/* Calendar header */}
                          <div className="flex items-center justify-between">
                            <button type="button" onClick={() => setSellerCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">◀</button>
                            <div className="text-xs font-medium text-gray-700">
                              {sellerCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                            <button type="button" onClick={() => setSellerCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">▶</button>
                          </div>
                          {/* Weekday labels */}
                          <div className="grid grid-cols-7 text-[10px] font-medium text-gray-500">
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}
                          </div>
                          {/* Days grid with range highlight */}
                          <div className="grid grid-cols-7 gap-1 text-xs">
                            {Array.from({ length: sellerFirstWeekday(sellerCalendarMonth) }).map((_,i) => <div key={'spacer'+i} />)}
                            {Array.from({ length: sellerDaysInMonth(sellerCalendarMonth) }).map((_,i) => {
                              const day = new Date(sellerCalendarMonth.getFullYear(), sellerCalendarMonth.getMonth(), i+1);
                              const selectedStart = sellerRange.start && day.getTime() === sellerRange.start.getTime();
                              const selectedEnd = sellerRange.end && day.getTime() === sellerRange.end.getTime();
                              const inRange = isSellerInRange(day);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSellerDayClick(day)}
                                  className={`h-7 rounded-md flex items-center justify-center transition border text-gray-700 ${selectedStart || selectedEnd ? 'bg-teal-600 text-white border-teal-600 font-semibold' : inRange ? 'bg-teal-100 border-teal-200' : 'bg-white border-gray-200 hover:bg-gray-100'} ${day.toDateString() === new Date().toDateString() && !selectedStart && !selectedEnd ? 'ring-1 ring-teal-400' : ''}`}
                                  title={toISO(day)}
                                >{i+1}</button>
                              );
                            })}
                          </div>
                          {/* Actions */}
                          <div className="flex items-center justify-between pt-1">
                            <button type="button" onClick={() => { setSellerRange({ start: null, end: null }); setSellerFilters(f=> ({ ...f, dateRange: 'last-30' })); }} className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100">Clear</button>
                            <div className="flex gap-2">
                              <button type="button" onClick={applySellerRange} disabled={!sellerRange.start} className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-40">Apply</button>
                              <button type="button" onClick={() => setShowSellerDatePicker(false)} className="text-[11px] px-3 py-1 rounded-md border bg-white hover:bg-gray-100">Done</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select product</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={sellerFilters.brand} onChange={(e)=> setSellerFilters(f=>({ ...f, brand: e.target.value }))}>
                      <option value="all">All products</option>
                      {productOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select subcategory</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={sellerFilters.subcategory} onChange={(e)=> setSellerFilters(f=>({ ...f, subcategory: e.target.value }))}>
                      <option value="all">All subcategories</option>
                      {subcategoryOptions.map(sc => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2 pt-2">
                    <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-sm transition">Apply</button>
                    <button onClick={()=> setSellerFilters({ dateRange: "last-30", brand: "all", subcategory: "all", location: "all", paymentType: "all" })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition">Reset</button>
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Revenue</h4>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{currency.format(kpiMetrics.totalRevenue)}</div>
                    <div className="text-xs text-gray-500">Sales</div>
                  </div>
                  <div className="hidden md:block text-xs text-gray-500">Date: {sellerFilters.dateRange.replace("last-", "Last ")} days</div>
                </div>
                {(() => {
                  // Build simple time series from filtered paid orders (by accrual date)
                  const byDate = new Map<string, { amount: number; count: number }>();
                  paidOrders.forEach(o => {
                    const key = o.timestamp.slice(0,10); // YYYY-MM-DD
                    const prev = byDate.get(key) || { amount: 0, count: 0 };
                    byDate.set(key, { amount: prev.amount + getAmount(o), count: prev.count + 1 });
                  });
                  const series = Array.from(byDate.entries())
                    .sort(([a],[b]) => a.localeCompare(b))
                    .map(([date, v]) => {
                      const d = new Date(date);
                      const label = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
                      return { name: label, revenue: v.amount, count: v.count };
                    });
                  return <RevenueChart data={series} />;
                })()}
                <div className="mt-2 text-[11px] text-gray-500">(date)</div>
              </div>

              {/* Tutorial modal */}
              {showTutorial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowTutorial(false)} />
                  <div className="relative z-10 w-[92vw] max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">Dashboard tutorial</div>
                      <button className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setShowTutorial(false)}>Close</button>
                    </div>
                    <div className="p-4 space-y-2 text-sm text-gray-700">
                      <p>Use the filters below the KPIs to refine metrics by date, brand, category, location, and payment type.</p>
                      <p>KPIs summarize performance. The line chart shows revenue over time. Hover points for details.</p>
                      <p>Fulfillment times help you optimize operations from packing to handover.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        // Admin layout (existing)
        return (
          <div className="space-y-8">
            {/* Top Section - Metrics Cards (3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Shipped Card */}
              {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"> */}
                {/* <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ORDER SHIPPED</p>
                    <p className="text-sm text-gray-500 mb-2">TOTAL ORDERS SHIPPED</p>
                    <p className="text-2xl font-bold text-gray-900">{adminMetrics.shippedOrders.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">of {adminMetrics.totalOrders.toLocaleString()} total orders</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-teal-600" />
                  </div>
                </div> */}
              {/* </div> */}
              {/* Total Transactions Card */}
              {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">TOTAL NUMBER OF</p>
                    <p className="text-sm text-gray-500 mb-2">DELIVERED TRANSACTIONS</p>
                    <p className="text-2xl font-bold text-gray-900">{adminMetrics.deliveredOrders.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">of {adminMetrics.totalOrders.toLocaleString()} total orders</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div> */}
            </div>
            {/* Horizontal Filters Bar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 gap-4">
                {/* Date Range (picker) */}
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-medium text-gray-700 mb-2">DATE RANGE</label>
                  <div ref={adminDateDropdownRef} className="relative">
                    {/* Trigger / summary */}
                    <button
                      type="button"
                      onClick={() => setShowAdminDatePicker(v => !v)}
                      aria-haspopup="dialog"
                      aria-expanded={showAdminDatePicker}
                      className="w-full border border-gray-200 rounded-xl bg-gray-50 px-3 py-2 flex items-center justify-between text-left"
                    >
                      <span className="text-[11px] text-gray-600 truncate pr-2">
                        {adminFilters.dateFrom ? `${adminFilters.dateFrom} → ${adminFilters.dateTo}` : 'Select range or preset'}
                      </span>
                      <span className={`text-[11px] transition-transform ${showAdminDatePicker ? 'rotate-180' : ''}`}>⌄</span>
                    </button>
                    {showAdminDatePicker && (
                      <div className="absolute left-0 mt-2 z-30 w-[300px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
                        {/* Presets */}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => applyPreset('today')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Today</button>
                          <button onClick={() => applyPreset('7')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 7 days</button>
                          <button onClick={() => applyPreset('30')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 30 days</button>
                          {adminRange.start && (
                            <span className="text-[10px] text-gray-500 ml-auto">{toISO(adminRange.start)} → {toISO(adminRange.end || adminRange.start)}</span>
                          )}
                        </div>
                        {/* Calendar header */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setAdminCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100"
                          >◀</button>
                          <div className="text-xs font-medium text-gray-700">
                            {adminCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdminCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100"
                          >▶</button>
                        </div>
                        {/* Weekday labels */}
                        <div className="grid grid-cols-7 text-[10px] font-medium text-gray-500">
                          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}
                        </div>
                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {Array.from({ length: firstWeekday(adminCalendarMonth) }).map((_,i) => <div key={'spacer'+i} />)}
                          {Array.from({ length: daysInMonth(adminCalendarMonth) }).map((_,i) => {
                            const day = new Date(adminCalendarMonth.getFullYear(), adminCalendarMonth.getMonth(), i+1);
                            const selectedStart = adminRange.start && day.getTime() === adminRange.start.getTime();
                            const selectedEnd = adminRange.end && day.getTime() === adminRange.end.getTime();
                            const inRange = isInRange(day);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`h-7 rounded-md flex items-center justify-center transition border text-gray-700 ${selectedStart || selectedEnd ? 'bg-teal-600 text-white border-teal-600 font-semibold' : inRange ? 'bg-teal-100 border-teal-200' : 'bg-white border-gray-200 hover:bg-gray-100'} ${day.toDateString() === new Date().toDateString() && !selectedStart && !selectedEnd ? 'ring-1 ring-teal-400' : ''}`}
                                title={toISO(day)}
                              >{i+1}</button>
                            );
                          })}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => { setAdminRange({ start: null, end: null }); setAdminFilters(f=> ({ ...f, dateFrom: '', dateTo: '' })); }}
                            className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100"
                          >Clear</button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={applyRange}
                              disabled={!adminRange.start}
                              className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-40"
                            >Apply</button>
                            <button
                              type="button"
                              onClick={() => setShowAdminDatePicker(false)}
                              className="text-[11px] px-3 py-1 rounded-md border bg-white hover:bg-gray-100"
                            >Done</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Province Filter */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">PROVINCE</label>
                  <select
                    value={adminFilters.province}
                    onChange={(e)=> setAdminFilters(f=> ({...f, province: e.target.value}))}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">All provinces</option>
                    {phProvinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {/* City Filter (dropdown trigger that opens checkbox list) */}
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">CITY</label>
                  <div ref={adminCityDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={adminFilters.province === 'all'}
                      onClick={() => setShowAdminCityDropdown(v => !v)}
                      className={`w-full p-2 border rounded-lg text-xs bg-white flex items-center justify-between ${adminFilters.province === 'all' ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span className="truncate pr-2">
                        {adminFilters.province === 'all'
                          ? 'Select a province to choose cities'
                          : adminSelectedCityCodes.size > 0
                            ? `${adminSelectedCityCodes.size} city${adminSelectedCityCodes.size > 1 ? 'ies' : ''} selected`
                            : 'Select cities'}
                      </span>
                      <span className={`text-[11px] transition-transform ${showAdminCityDropdown ? 'rotate-180' : ''}`}>⌄</span>
                    </button>
                    {showAdminCityDropdown && adminFilters.province !== 'all' && (
                      <div className="absolute left-0 mt-2 z-30 w-[300px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-gray-700">Select cities in {phProvinces.find(p=>p.code===adminFilters.province)?.name || 'province'}</div>
                          {adminSelectedCityCodes.size === 0 && phCities.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800">Required</span>
                          )}
                        </div>
                        {phCities.length > 0 ? (
                          <div className="max-h-40 overflow-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {phCities.map(c => {
                                const checked = adminSelectedCityCodes.has(c.code);
                                return (
                                  <label key={c.code} className="flex items-center gap-2 text-[11px] text-gray-700">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 accent-[#F68F22] focus:ring-[#F68F22]"
                                      checked={checked}
                                      onChange={() => {
                                        setAdminSelectedCityCodes(prev => {
                                          const next = new Set(prev);
                                          if (next.has(c.code)) next.delete(c.code); else next.add(c.code);
                                          return next;
                                        });
                                      }}
                                    />
                                    <span>{c.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500">Loading cities…</div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setAdminSelectedCityCodes(new Set())}
                            className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100"
                          >Clear</button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAdminCityDropdown(false)}
                              className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white"
                            >Done</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Shop Name (Seller) */}
                {/* <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">SHOP NAME</label>
                  <select
                    value={adminFilters.seller}
                    onChange={(e)=> setAdminFilters(f=> ({...f, seller: e.target.value}))}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">All shops</option>
                    {adminSellers.map(s => (
                      <option key={s.uid} value={s.uid}>{s.shopName || s.name || s.uid}</option>
                    ))}
                  </select>
                </div> */}
                {/* Apply / Reset */}
                <div className="flex items-end gap-2 pt-2">
                  <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-sm transition">Apply</button>
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition"
                    onClick={() => setAdminFilters({ dateFrom: '', dateTo: '', province: 'all', city: 'all', seller: 'all' })}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            {/* Revenue Chart Section */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">REVENUE</h3>
                  <p className="text-3xl font-bold text-gray-900">PHP 3,000,000.00</p>
                </div>
              </div>
              <RevenueChart />
            </div>
            {/* NEW: Export + Seller Metrics Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 tracking-wide">EXPORT</h3>
                <div className="flex items-center gap-2">
                  {/* Export button with dropdown */}
                  <div ref={exportMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowExportMenu(v => !v)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="whitespace-nowrap">Export</span>
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 z-40 w-32 border border-gray-200 bg-white rounded-xl shadow-lg py-1 animate-fade-in">
                        <button
                          type="button"
                          onClick={exportSellerMetricsCSV}
                          className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span>Export CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={exportSellerMetricsPDF}
                          className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span>📕</span>
                          <span>Export PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Column filter trigger */}
                  <div ref={exportColumnMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowExportColumnMenu(v => !v)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="whitespace-nowrap">Columns</span>
                    </button>
                    {showExportColumnMenu && (
                      <div className="absolute right-0 mt-2 z-40 w-56 border border-gray-200 bg-white rounded-xl shadow-lg p-3 space-y-2 animate-fade-in">
                        <div className="text-[11px] font-semibold text-gray-700 mb-1">Visible columns</div>
                        {Object.keys(columnLabels).map(key => (
                          <label key={key} className="flex items-center gap-2 text-[11px] text-gray-700">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 accent-[#F68F22] focus:ring-[#F68F22]"
                              checked={exportColumnVisibility[key]}
                              onChange={() => setExportColumnVisibility(v => ({ ...v, [key]: !v[key] }))}
                            />
                            <span>{columnLabels[key]}</span>
                          </label>
                        ))}
                        <div className="pt-1 text-[10px] text-gray-400">Uncheck to hide column from table.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-left text-[11px] font-semibold tracking-wide">
                      {visibleColumnKeys.map(k => (
                        <th key={k} className="px-4 py-3">{columnLabels[k]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminSellersDisplayed.length === 0 && (
                      <tr>
                        <td colSpan={visibleColumnKeys.length || 1} className="px-4 py-16">
                          <div className="flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                              <span className="text-xs font-semibold text-gray-400">⌀</span>
                            </div>
                            <div className="text-sm font-medium">No data to display</div>
                            <div className="mt-1 text-[11px] text-gray-400">There are no sales in the selected time period</div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {adminSellersDisplayed.map(s => {
                      // Calculate gross sales from real-time orders with ALL admin filters
                      const sellerOrders = confirmationOrders.filter(o => {
                        // Check if order belongs to this seller
                        const orderSellerIds = o.sellerIds || [];
                        if (!orderSellerIds.includes(s.uid)) return false;
                        
                        // Apply date range filter
                        if (adminFilters.dateFrom && adminFilters.dateTo) {
                          const orderDate = o.timestamp ? o.timestamp.slice(0, 10) : '';
                          if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) {
                            return false;
                          }
                        }
                        
                        // Apply province filter - EXCLUDE orders without region data when filter is active
                        if (adminFilters.province !== 'all') {
                          // If order has no region data, EXCLUDE it (filter it out)
                          if (!o.region || !o.region.province) {
                            return false;
                          }
                          
                          const orderProvinceCode = o.region.province;
                          
                          // DEBUG: Log order region data for first order
                          if (s === adminSellersDisplayed[0] && o === confirmationOrders[0]) {
                            console.log('[PROVINCE FILTER DEBUG]', {
                              filterProvinceCode: adminFilters.province,
                              orderProvinceCode: orderProvinceCode,
                              orderRegion: o.region,
                              orderFullData: { id: o.id, sellerIds: o.sellerIds, region: o.region },
                              match: orderProvinceCode === adminFilters.province,
                            });
                          }
                          
                          // Filter out if province doesn't match
                          if (orderProvinceCode !== adminFilters.province) {
                            return false;
                          }
                        }
                        
                        // Apply city filter (multi-select) - EXCLUDE orders without region data when filter is active
                        if (adminSelectedCityCodes.size > 0) {
                          // If order has no region data, EXCLUDE it (filter it out)
                          if (!o.region || !o.region.municipality) {
                            return false;
                          }
                          
                          const orderCity = o.region.municipality;
                          // Find matching city code from phCities
                          const matchingCity = phCities.find(c => c.name === orderCity);
                          if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) {
                            return false;
                          }
                        }
                        
                        // Only count PAID orders
                        if (!isPaidStatus(o.status)) return false;
                        
                        return true;
                      });
                      
                      const gross = sellerOrders.reduce((sum, o) => {
                        const summary = o.summary || {};
                        const subtotal = Number(summary.subtotal) || 0;
                        return sum + subtotal;
                      }, 0);
                      
                      // Calculate average order value
                      const tx = sellerOrders.length;
                      const avgOrder = tx > 0 ? gross / tx : 0;
                      
                      // Calculate fees from actual order data
                      const logistic = sellerOrders.reduce((sum, o) => {
                        const summary = o.summary || {};
                        return sum + (Number(summary.sellerShippingCharge) || 0);
                      }, 0);
                      
                      const payment = sellerOrders.reduce((sum, o) => {
                        const fees = o.feesBreakdown || {};
                        return sum + (Number(fees.paymentProcessingFee) || 0);
                      }, 0);
                      
                      const inquiry = sellerOrders.reduce((sum, o) => {
                        const fees = o.feesBreakdown || {};
                        return sum + (Number(fees.platformFee) || 0);
                      }, 0);
                      
                      // Debug logging for first seller - COMPREHENSIVE CHECK
                      if (s === adminSellersDisplayed[0]) {
                        console.log('========================================');
                        console.log('[Export Table] COMPREHENSIVE DEBUG');
                        console.log('========================================');
                        
                        // All sellers we're checking
                        console.log('1. ALL SELLERS IN SYSTEM:', adminSellersDisplayed.map(seller => ({
                          uid: seller.uid,
                          shopName: seller.shopName || seller.name,
                        })));
                        
                        // All orders and their sellerIds with seller name lookup
                        console.log('2. ALL ORDERS AND THEIR SELLERIDS:', confirmationOrders.map(o => {
                          const orderSellerIds = o.sellerIds || [];
                          const sellerNames = orderSellerIds.map(sid => {
                            const seller = adminSellersDisplayed.find(s => s.uid === sid);
                            return seller ? (seller.shopName || seller.name) : 'UNKNOWN SELLER';
                          });
                          const paidStatuses = ['to_ship', 'processing', 'completed'];
                          return {
                            orderId: o.id,
                            sellerIds: o.sellerIds,
                            sellerNames: sellerNames,
                            sellerIdsType: Array.isArray(o.sellerIds) ? 'array' : typeof o.sellerIds,
                            sellerIdsLength: Array.isArray(o.sellerIds) ? o.sellerIds.length : 'N/A',
                            status: o.status,
                            isPaid: isPaidStatus(o.status),
                            isPaidCheck: paidStatuses.includes(o.status),
                            timestamp: o.timestamp,
                            subtotal: o.summary?.subtotal,
                          };
                        }));
                        
                        // Match summary: which sellers have orders
                        const sellerOrderCounts = adminSellersDisplayed.map(seller => {
                          const count = confirmationOrders.filter(o => {
                            const orderSellerIds = o.sellerIds || [];
                            return orderSellerIds.includes(seller.uid) && isPaidStatus(o.status);
                          }).length;
                          return {
                            shopName: seller.shopName || seller.name,
                            uid: seller.uid,
                            paidOrderCount: count,
                          };
                        }).filter(x => x.paidOrderCount > 0);
                        
                        console.log('3. SELLERS WITH PAID ORDERS:', sellerOrderCounts);
                        
                        // First seller match attempt
                        console.log('4. FIRST SELLER MATCH ATTEMPT:', {
                          sellerName: s.shopName || s.name || s.uid,
                          sellerUid: s.uid,
                          sellerUidType: typeof s.uid,
                          totalOrders: confirmationOrders.length,
                          matchedOrders: sellerOrders.length,
                          firstOrderSellerIds: confirmationOrders[0]?.sellerIds,
                          doesMatch: confirmationOrders[0]?.sellerIds?.includes(s.uid),
                        });
                        
                        console.log('========================================');
                      }
                      
                      const cellByKey: Record<string, any> = {
                        seller: s.storeName || s.shopName || s.name || s.uid,
                        gross: gross,
                        avg: avgOrder,
                        tx: tx,
                        orderSummary: tx, // NEW: Order count for the summary
                        logistic: logistic,
                        payment: payment,
                        inquiry: inquiry,
                      };
                      
                      // Calculate row total (sum of numeric visible columns, excluding 'seller' and 'orderSummary')
                      const rowTotal = visibleColumnKeys.reduce((sum, k) => {
                        if (k === 'seller' || k === 'orderSummary') return sum;
                        return sum + (typeof cellByKey[k] === 'number' ? cellByKey[k] : 0);
                      }, 0);
                      
                      return (
                        <tr key={s.uid} className="border-t last:border-b-0 hover:bg-gray-50">
                          {visibleColumnKeys.map(k => (
                            <td key={k} className={`px-4 py-3 text-gray-700 ${k === 'seller' ? 'font-medium text-gray-900' : ''}`}>
                              {k === 'orderSummary' ? (
                                <button
                                  onClick={() => handleOpenOrderSummary(s)}
                                  className="text-teal-600 hover:text-teal-700 font-medium underline cursor-pointer"
                                  title="View order details"
                                >
                                  {tx} {tx === 1 ? 'order' : 'orders'}
                                </button>
                              ) : (
                                typeof cellByKey[k] === 'number' ? cellByKey[k].toLocaleString() : cellByKey[k]
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr className="text-[11px] font-bold">
                      {visibleColumnKeys.map((k, idx) => {
                        if (k === 'seller') {
                          return <td key={k} className="px-4 py-3 text-gray-900">TOTAL</td>;
                        }
                        // Skip orderSummary in totals (it's not a sum-able metric)
                        if (k === 'orderSummary') {
                          const totalOrders = adminSellersDisplayed.reduce((sum, s) => {
                            const sellerOrders = confirmationOrders.filter(o => {
                              const orderSellerIds = o.sellerIds || [];
                              if (!orderSellerIds.includes(s.uid)) return false;
                              
                              // Date range filter
                              if (adminFilters.dateFrom && adminFilters.dateTo) {
                                const orderDate = o.timestamp ? o.timestamp.slice(0, 10) : '';
                                if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) return false;
                              }
                              
                              // Province filter
                              if (adminFilters.province !== 'all') {
                                if (o.region && o.region.province) {
                                  const orderProvinceCode = o.region.province;
                                  if (orderProvinceCode !== adminFilters.province) return false;
                                }
                              }
                              
                              // City filter
                              if (adminSelectedCityCodes.size > 0) {
                                if (o.region && o.region.municipality) {
                                  const orderCity = o.region.municipality;
                                  const matchingCity = phCities.find(c => c.name === orderCity);
                                  if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) return false;
                                }
                              }
                              
                              if (!isPaidStatus(o.status)) return false;
                              return true;
                            });
                            return sum + sellerOrders.length;
                          }, 0);
                          return <td key={k} className="px-4 py-3 text-gray-900">{totalOrders} {totalOrders === 1 ? 'order' : 'orders'}</td>;
                        }
                        // Calculate column total with ALL admin filters
                        const columnTotal = adminSellersDisplayed.reduce((sum, s) => {
                          const sellerOrders = confirmationOrders.filter(o => {
                            const orderSellerIds = o.sellerIds || [];
                            if (!orderSellerIds.includes(s.uid)) return false;
                            
                            // Date range filter
                            if (adminFilters.dateFrom && adminFilters.dateTo) {
                              const orderDate = o.timestamp ? o.timestamp.slice(0, 10) : '';
                              if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) return false;
                            }
                            
                            // Province filter - EXCLUDE orders without region data when filter is active
                            if (adminFilters.province !== 'all') {
                              if (!o.region || !o.region.province) {
                                return false;
                              }
                              const orderProvinceCode = o.region.province;
                              if (orderProvinceCode !== adminFilters.province) return false;
                            }
                            
                            // City filter - EXCLUDE orders without region data when filter is active
                            if (adminSelectedCityCodes.size > 0) {
                              if (!o.region || !o.region.municipality) {
                                return false;
                              }
                              const orderCity = o.region.municipality;
                              const matchingCity = phCities.find(c => c.name === orderCity);
                              if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) return false;
                            }
                            
                            if (!isPaidStatus(o.status)) return false;
                            return true;
                          });
                          const gross = sellerOrders.reduce((s, o) => s + (Number(o.summary?.subtotal) || 0), 0);
                          const tx = sellerOrders.length;
                          const avgOrder = tx > 0 ? gross / tx : 0;
                          const logistic = sellerOrders.reduce((s, o) => s + (Number(o.summary?.sellerShippingCharge) || 0), 0);
                          const payment = sellerOrders.reduce((s, o) => s + (Number(o.feesBreakdown?.paymentProcessingFee) || 0), 0);
                          const inquiry = sellerOrders.reduce((s, o) => s + (Number(o.feesBreakdown?.platformFee) || 0), 0);
                          const values: Record<string, number> = { gross, avg: avgOrder, tx, logistic, payment, inquiry };
                          return sum + (values[k] || 0);
                        }, 0);
                        return <td key={k} className="px-4 py-3 text-gray-900">{columnTotal.toLocaleString()}</td>;
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 border rounded-md bg-white hover:bg-gray-50">{'<'}</button>
                  <button className="px-2 py-1 border rounded-md bg-white hover:bg-gray-50">{'>'}</button>
                </div>
                <div>Page 1 of 1</div>
                <div>
                  <select className="border rounded-md px-2 py-1 bg-white">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Order Summary Modal */}
            {showOrderSummaryModal && selectedSellerForOrders && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">Order Summary</h3>
                      <p className="text-sm text-white/80 mt-1">{selectedSellerForOrders.name}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowOrderSummaryModal(false);
                        setSelectedSellerForOrders(null);
                        setSellerOrders([]);
                        setExpandedOrderIds(new Set()); // Reset expanded items
                      }}
                      className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {sellerOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium">No orders found</p>
                        <p className="text-sm text-gray-500 mt-1">This seller has no orders matching the current filters</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-600">
                            Showing <span className="font-semibold text-gray-900">{sellerOrders.length}</span> {sellerOrders.length === 1 ? 'order' : 'orders'}
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          {sellerOrders.map((order) => (
                            <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white">
                              {/* Order Header */}
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">#{order.id}</span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      order.status === 'processing' || order.status === 'to_ship' ? 'bg-blue-100 text-blue-700' :
                                      order.status === 'shipped' || order.status === 'shipping' ? 'bg-purple-100 text-purple-700' :
                                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {order.status.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">
                                      ₱{(order.summary?.subtotal || order.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div className="p-4">
                                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                  <div>
                                    <span className="text-gray-500 text-xs">Customer</span>
                                    <p className="text-gray-900 font-medium">{order.customer?.name || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 text-xs">Date</span>
                                    <p className="text-gray-900 font-medium">
                                      {order.timestamp ? new Date(order.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 text-xs">Payment</span>
                                    <p className="text-gray-900 font-medium">{order.feesBreakdown?.paymentMethod || order.paymentType || 'N/A'}</p>
                                  </div>
                                </div>

                                {order.region && (
                                  <div className="mb-4 text-sm">
                                    <span className="text-gray-500 text-xs">Location</span>
                                    <p className="text-gray-900 font-medium">
                                      {[order.region.municipality, order.region.province].filter(Boolean).join(', ') || 'N/A'}
                                    </p>
                                  </div>
                                )}

                                {/* Items List - Collapsible */}
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-4">
                                    <button
                                      onClick={() => {
                                        setExpandedOrderIds(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(order.id)) {
                                            newSet.delete(order.id);
                                          } else {
                                            newSet.add(order.id);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 hover:text-teal-600 transition py-2 px-3 rounded-lg hover:bg-gray-50"
                                    >
                                      <span>Order Items ({order.items.length})</span>
                                      <svg 
                                        className={`w-4 h-4 transition-transform ${expandedOrderIds.has(order.id) ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    {expandedOrderIds.has(order.id) && (
                                      <div className="space-y-2 mt-2 animate-fade-in">
                                        {order.items.map((item, idx) => (
                                          <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            {/* Product Image */}
                                            {item.imageUrl && (
                                              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <img 
                                                  src={item.imageUrl} 
                                                  alt={item.name || 'Product'} 
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    // Fallback to placeholder if image fails to load
                                                    e.currentTarget.src = '/placeholder.svg';
                                                  }}
                                                />
                                              </div>
                                            )}
                                            {/* Product Details */}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{item.name || 'Unnamed Item'}</p>
                                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                {item.category && (
                                                  <span className="text-xs text-gray-500">
                                                    <span className="font-medium">Category:</span> {item.category}
                                                  </span>
                                                )}
                                                {item.subcategory && (
                                                  <span className="text-xs text-gray-500">
                                                    <span className="font-medium">Type:</span> {item.subcategory}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {/* Pricing */}
                                            <div className="text-right flex-shrink-0 ml-4">
                                              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                ₱{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {item.quantity || 1}x ₱{(item.price || 0).toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Fees Breakdown */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                      <span>Subtotal</span>
                                      <span>₱{(order.summary?.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    {order.summary?.sellerShippingCharge !== undefined && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Shipping Charge</span>
                                        <span>₱{(order.summary.sellerShippingCharge || 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {order.feesBreakdown?.paymentProcessingFee !== undefined && (
                                      <div className="flex justify-between text-red-600 text-xs">
                                        <span>Payment Processing Fee</span>
                                        <span>-₱{(order.feesBreakdown.paymentProcessingFee || 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {order.feesBreakdown?.platformFee !== undefined && (
                                      <div className="flex justify-between text-red-600 text-xs">
                                        <span>Platform Fee</span>
                                        <span>-₱{(order.feesBreakdown.platformFee || 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                    <button
                      onClick={() => {
                        // Export orders to CSV with seller info and timestamp header
                        const now = new Date();
                        const exportDate = now.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                        const exportTime = now.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          hour12: true 
                        });
                        
                        // Calculate summary totals
                        const totalOrders = sellerOrders.length;
                        const totalRevenue = sellerOrders.reduce((sum, o) => sum + (o.summary?.subtotal || 0), 0);
                        const totalShipping = sellerOrders.reduce((sum, o) => sum + (o.summary?.sellerShippingCharge || 0), 0);
                        const totalPaymentFees = sellerOrders.reduce((sum, o) => sum + (o.feesBreakdown?.paymentProcessingFee || 0), 0);
                        const totalPlatformFees = sellerOrders.reduce((sum, o) => sum + (o.feesBreakdown?.platformFee || 0), 0);
                        
                        // Header section with seller info and metadata
                        const headerSection = [
                          ['Order Summary Report'],
                          [''],
                          ['Seller:', selectedSellerForOrders.name],
                          ['Export Date:', exportDate],
                          ['Export Time:', exportTime],
                          ['Total Orders:', totalOrders.toString()],
                          [''],
                          ['Summary:'],
                          ['Total Revenue:', `₱${totalRevenue.toFixed(2)}`],
                          ['Total Shipping:', `₱${totalShipping.toFixed(2)}`],
                          ['Total Payment Fees:', `₱${totalPaymentFees.toFixed(2)}`],
                          ['Total Platform Fees:', `₱${totalPlatformFees.toFixed(2)}`],
                          ['Net Amount:', `₱${(totalRevenue - totalPaymentFees - totalPlatformFees).toFixed(2)}`],
                          [''],
                          [''], // Extra blank line before table
                        ];
                        
                        const headers = ['Order ID', 'Status', 'Customer', 'Date', 'Items', 'Payment', 'Location', 'Subtotal', 'Shipping', 'Payment Fee', 'Platform Fee'];
                        const rows = sellerOrders.map(o => [
                          o.id,
                          o.status,
                          o.customer?.name || 'N/A',
                          o.timestamp ? new Date(o.timestamp).toLocaleDateString() : 'N/A',
                          o.items?.map(i => `${i.name} (${i.quantity}x)`).join('; ') || 'N/A',
                          o.feesBreakdown?.paymentMethod || o.paymentType || 'N/A',
                          o.region ? [o.region.municipality, o.region.province].filter(Boolean).join(', ') : 'N/A',
                          (o.summary?.subtotal || 0).toFixed(2),
                          (o.summary?.sellerShippingCharge || 0).toFixed(2),
                          (o.feesBreakdown?.paymentProcessingFee || 0).toFixed(2),
                          (o.feesBreakdown?.platformFee || 0).toFixed(2),
                        ]);
                        
                        // Combine header section with data table
                        const csvContent = [
                          ...headerSection.map(row => row.map(cell => `"${cell}"`).join(',')),
                          headers.map(cell => `"${cell}"`).join(','),
                          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `order-summary-${selectedSellerForOrders.name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0,10)}.csv`;
                        link.click();
                      }}
                      disabled={sellerOrders.length === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowOrderSummaryModal(false);
                          setSelectedSellerForOrders(null);
                          setSellerOrders([]);
                          setExpandedOrderIds(new Set()); // Reset expanded items
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'seller-orders':
        if (!isAllowed('seller-orders')) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <OrderTab
            orders={confirmationOrders}
            loading={loading}
            error={error}
            onRefresh={() => {/* listener keeps it live; left for future manual refresh */}}
          />
        );
      // NEW: Admin Pending QC tab
      case 'product-qc':
        if (!isAllowed('product-qc')) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <ProductQCTab />;
      case "profile":
        if (!isAllowed("profile")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <SellerProfileTab />;
      case "reports":
        if (!isAllowed("reports")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <ReportsTab />;
      case "booking":
        if (!isAllowed("booking")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <Booking />;
      case "confirmation":
        if (!isAllowed("confirmation")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <ConfirmationTab 
            orders={confirmationOrders}
            loading={loading}
            error={error}
            setError={setError}
            onConfirmOrder={handleConfirmOrder}
            onRejectOrder={handleRejectOrder}
            onExportConfirmations={handleExportConfirmations}
            onTabChange={handleTabChange}
          />
        );
      case "withdrawal":
        if (!isAllowed("withdrawal")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        // Show seller-facing withdrawal for non-admin users
        if (!isAdmin) {
          return (
            <SellerWithdrawalTab
              financialMetrics={financialMetrics}
              sellerFilters={sellerFilters}
              onFiltersChange={setSellerFilters}
              loading={loading}
            />
          );
        }
        // Admin view for managing withdrawal requests
        return (
          <WithdrawalTab 
            loading={loading}
            error={error}
            setError={setError}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
            onExportWithdrawals={handleExportWithdrawals}
            onTabChange={handleTabChange}
          />
        );
      case "access":
        if (!isAllowed("access")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <AccessTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      // NEW: route sub-accounts tab to AccessTab (seller-facing)
      case "sub-accounts":
        return (
          <AccessTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "images":
        if (!isAllowed("images")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <ImagesTab 
            loading={loading}
            error={error}
            setError={setError}
            onTabChange={handleTabChange}
          />
        );
      case "users":
        if (!isAllowed("users")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <UsersTab />
        );
      // Seller inventory tab
      case "inventory":
        if (!isAllowed("inventory")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <InventoryTab />
        );
      // Seller add product tab
      case "add-product":
        if (!isAllowed("add-product")) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return (
          <AddProduct />
        );
      // NEW: Admin Warranty tab
      case 'warranty':
        if (!isAdmin) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <WarrantyManager />;
      // NEW: Admin Categories tab
      case 'categories':
        if (!isAdmin) return <div className="p-6 bg-white rounded-xl border">Access denied</div>;
        return <CategoryManager />;
      default:
        return null;
    }
  };

  const getPageTitle = () => {
    switch (activeItem) {
      case "dashboard": return "Dashboard";
      case "booking": return "Booking";
      case "confirmation": return "Confirmation";
      case "withdrawal": return "Withdrawal";
      case "access": return "Access";
      case 'seller-orders': return 'Orders';
      case 'reports': return 'Reports'; // added proper title
      // NEW: Admin QC title
      case 'product-qc': return 'Pending QC';
      // NEW: Sub-accounts title
      case "sub-accounts": return "Sub Account";
      case "images": return "Images";
      case "users": return "Users";
      // NEW: Warranty title
      case 'warranty': return 'Warranty';
      // NEW: Categories title
      case 'categories': return 'Categories';
      default: return "Dashboard";
    }
  };

  const getPageSubtitle = () => {
    switch (activeItem) {
      case "dashboard":
        return `Welcome back, ${user.name || user.email}`;
      case "profile":
        return "Manage seller profile, documents, and security";
      case "reports":
        return "Sales analytics by brand, category, item, and payment type";
      case "booking":
        return "Manage dental appointments and bookings";
      case 'seller-orders':
        return 'Manage seller order statuses and actions';
      // NEW: Admin QC subtitle
      case 'product-qc':
        return 'Review and approve products pending quality control';
      case "confirmation":
        return "Review and confirm patient appointments";
      case "withdrawal":
        return "Manage payment withdrawals and financial transactions";
      case "access":
        return "Control user access and system permissions";
      // NEW: Sub-accounts subtitle
      case "sub-accounts":
        return "Create and manage seller sub-accounts";
      case "images":
        return "Manage dental images, x-rays, and patient photos";
      case "users":
        return "Manage patients, staff, and user accounts";
      // NEW: Warranty subtitle
      case 'warranty':
        return 'Set warranty durations by category and subcategory';
      // NEW: Categories subtitle
      case 'categories':
        return 'Create, rename, and delete categories and their subcategories';
      default:
        return "";
    }
  };

  // Live Orders subscription for Orders tab
  useEffect(() => {
    if (!uid) {
      console.log('[Dashboard] No UID, skipping order subscription');
      return;
    }
    console.log('[Dashboard] Setting up order subscription for:', { uid, isAdmin, isSubAccount, parentId });
    let unsub: (() => void) | undefined;
    if (isAdmin) {
      console.log('[Dashboard] Subscribing to ALL orders (admin)');
      unsub = OrdersService.listenAll((orders) => {
        console.log('[Dashboard] Received orders (admin):', orders.length, orders);
        
        // DEBUG: Log all order region data
        console.log('[Dashboard] ORDER REGION DATA:', orders.map(o => ({
          id: o.id,
          region: o.region,
          hasRegion: !!o.region,
          province: o.region?.province,
          municipality: o.region?.municipality,
        })));
        
        setConfirmationOrders(orders);
      });
    } else if (isSubAccount && parentId) {
      console.log('[Dashboard] Subscribing to parent seller orders:', parentId);
      unsub = OrdersService.listenBySeller(parentId, (orders) => {
        console.log('[Dashboard] Received orders (sub-account):', orders.length, orders);
        setConfirmationOrders(orders);
      });
    } else {
      console.log('[Dashboard] Subscribing to seller orders:', uid);
      unsub = OrdersService.listenBySeller(uid, (orders) => {
        console.log('[Dashboard] Received orders (seller):', orders.length, orders);
        setConfirmationOrders(orders);
      });
    }
    return () => {
      console.log('[Dashboard] Unsubscribing from orders');
      unsub && unsub();
    };
  }, [isAdmin, isSubAccount, parentId, uid]);
  
  // Load provinces (Philippines) - admin only
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const rows = await getPhProvinces();
      
      // Add "Metro Manila" as a special entry if not already present
      const hasMetroManila = rows.some(p => 
        p.name.toLowerCase().includes('metro manila') || 
        p.code === 'NCR' ||
        p.code === 'METRO_MANILA'
      );
      
      if (!hasMetroManila) {
        // Add Metro Manila at the beginning
        rows.unshift({ code: 'METRO_MANILA', name: 'Metro Manila' });
        console.log('[Dashboard] Added Metro Manila to province list');
      }
      
      setPhProvinces(rows);
    })();
  }, [isAdmin]);

  // Load cities when province changes (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const provinceCode = adminFilters.province;
    if (!provinceCode || provinceCode === 'all') { setPhCities([]); return; }
    
    (async () => {
      // Special handling for Metro Manila - use static city list
      if (provinceCode === 'METRO_MANILA') {
        const metroCities = [
          { code: "MNL", name: "Manila", provinceCode: "NCR" },
          { code: "MAC", name: "Makati", provinceCode: "NCR" },
          { code: "TAG", name: "Taguig", provinceCode: "NCR" },
          { code: "QSZ", name: "Quezon City", provinceCode: "NCR" },
          { code: "PAS", name: "Pasay", provinceCode: "NCR" },
          { code: "PAR", name: "Parañaque", provinceCode: "NCR" },
          { code: "MAN", name: "Mandaluyong", provinceCode: "NCR" },
          { code: "SAN", name: "San Juan", provinceCode: "NCR" },
          { code: "CAL", name: "Caloocan", provinceCode: "NCR" },
          { code: "VAL", name: "Valenzuela", provinceCode: "NCR" },
          { code: "NAV", name: "Navotas", provinceCode: "NCR" },
          { code: "MUN", name: "Muntinlupa", provinceCode: "NCR" },
          { code: "LAS", name: "Las Piñas", provinceCode: "NCR" },
          { code: "MAR", name: "Marikina", provinceCode: "NCR" },
          { code: "PAT", name: "Pateros", provinceCode: "NCR" },
          { code: "PAS2", name: "Pasig", provinceCode: "NCR" },
        ].sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`[Dashboard] Loaded ${metroCities.length} cities for Metro Manila`);
        setPhCities(metroCities);
        return;
      }
      
      // For other provinces, use the async loader
      try {
        const rows = await getPhCitiesAsync(provinceCode);
        console.log(`[Dashboard] Loaded ${rows.length} cities for province ${provinceCode}`);
        setPhCities(rows);
      } catch (error) {
        console.error('[Dashboard] Failed to load cities:', error);
        setPhCities([]);
      }
    })();
  }, [adminFilters.province, isAdmin]);

  // Load sellers from Firebase "Seller" collection (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const sellersSnap = await getDocs(collection(db, 'Seller'));
        console.log('[Dashboard] Total Seller documents fetched:', sellersSnap.docs.length);
        
        const allSellers = sellersSnap.docs.map(doc => {
          const data = doc.data();
          // Extract storeName from vendor.company.storeName path
          const storeName = data.vendor?.company?.storeName || '';
          // Extract role directly from root level (not from permissions)
          const role = data.role || '';
          
          return {
            uid: doc.id,
            name: data.name || data.ownerName || data.displayName || '',
            shopName: data.shopName || data.storeName || data.businessName || '',
            storeName: storeName, // This is what we'll display
            role: role,
          };
        });
        
        // Filter OUT admins - only show sellers (role !== 'admin')
        const sellers = allSellers.filter(seller => seller.role !== 'admin');
        
        console.log('[Dashboard] All sellers:', allSellers.length);
        console.log('[Dashboard] Filtered sellers (excluding admins):', sellers.length);
        console.log('[Dashboard] Seller details:', sellers.map(s => ({ 
          uid: s.uid, 
          storeName: s.storeName, 
          role: s.role 
        })));
        
        if (!cancelled) {
          setAdminSellers(sellers);
        }
      } catch (error) {
        console.error('[Dashboard] Error loading sellers:', error);
        if (!cancelled) {
          setAdminSellers([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Calculate admin metrics from confirmationOrders (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    
    // Filter orders based on admin filters
    const filteredOrdersForMetrics = confirmationOrders.filter(order => {
      // Date range filter
      if (adminFilters.dateFrom && adminFilters.dateTo) {
        const orderDate = order.timestamp ? order.timestamp.slice(0, 10) : ''; // YYYY-MM-DD
        if (orderDate < adminFilters.dateFrom || orderDate > adminFilters.dateTo) {
          return false;
        }
      }
      
      // Province filter
      if (adminFilters.province !== 'all') {
        const orderProvinceCode = order.region?.province;
        if (orderProvinceCode !== adminFilters.province) {
          return false;
        }
      }
      
      // City filter (multi-select)
      if (adminSelectedCityCodes.size > 0) {
        const orderCity = order.region?.municipality;
        // Find matching city code from phCities
        const matchingCity = phCities.find(c => c.name === orderCity);
        if (!matchingCity || !adminSelectedCityCodes.has(matchingCity.code)) {
          return false;
        }
      }
      
      // Shop name (seller) filter
      if (adminFilters.seller !== 'all') {
        const orderSellerIds = order.sellerIds || [];
        const isSeller = orderSellerIds.includes(adminFilters.seller);
        if (!isSeller) {
          return false;
        }
      }
      
      return true;
    });
    
    // Calculate metrics from filtered orders
    const totalOrders = filteredOrdersForMetrics.length;
    
    // Count orders with "completed" status as delivered
    const deliveredOrders = filteredOrdersForMetrics.filter(order => order.status === 'completed').length;
    
    // Count orders that have been shipped (based on statusHistory having "shipping" status)
    const shippedOrders = filteredOrdersForMetrics.filter(order => {
      // Check if order has statusHistory with "shipping" status
      if (order.statusHistory && Array.isArray(order.statusHistory)) {
        return order.statusHistory.some(history => 
          history.status === 'shipping' || history.status === 'shipped'
        );
      }
      // Fallback: check current status if no statusHistory
      return order.status === 'shipping' || order.status === 'shipped';
    }).length;
    
    setAdminMetrics({ totalOrders, deliveredOrders, shippedOrders });
    console.log('[Dashboard] Admin metrics calculated:', { 
      totalOrders, 
      deliveredOrders, 
      shippedOrders,
      filters: adminFilters,
      selectedCities: Array.from(adminSelectedCityCodes),
      totalBeforeFilter: confirmationOrders.length 
    });
  }, [isAdmin, confirmationOrders, adminFilters, adminSelectedCityCodes, phCities]);

  // Seller date picker refs/state (fix ReferenceError)
  const sellerDateDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showSellerDatePicker, setShowSellerDatePicker] = useState(false);
  const [sellerCalendarMonth, setSellerCalendarMonth] = useState<Date>(new Date());
  const [sellerRange, setSellerRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const sellerDaysInMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const sellerFirstWeekday = (month: Date) => new Date(month.getFullYear(), month.getMonth(), 1).getDay(); // 0=Sun
  const isSellerInRange = (day: Date) => {
    const { start, end } = sellerRange;
    if (!start) return false;
    if (start && !end) return day.getTime() === start.getTime();
    if (start && end) return day >= start && day <= end;
    return false;
  };
  const handleSellerDayClick = (day: Date) => {
    setSellerRange(prev => {
      if (!prev.start || (prev.start && prev.end)) return { start: day, end: null };
      if (day < prev.start) return { start: day, end: prev.start };
      return { start: prev.start, end: day };
    });
  };
  const applySellerRange = () => {
    const start = sellerRange.start;
    const end = sellerRange.end || sellerRange.start;
    if (!start || !end) return;
    setSellerFilters(f => ({ ...f, dateRange: `custom:${toISO(start)}:${toISO(end as Date)}` }));
    setShowSellerDatePicker(false);
  };
  const applySellerPreset = (preset: 'today' | '7' | '30') => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = new Date(end);
    if (preset === '7') start = new Date(end.getTime() - 6*86400000);
    if (preset === '30') start = new Date(end.getTime() - 29*86400000);
    if (preset === 'today') start = end;
    setSellerRange({ start, end });
    setSellerCalendarMonth(new Date(end.getFullYear(), end.getMonth(), 1));
    if (preset === 'today') {
      setSellerFilters(f => ({ ...f, dateRange: `custom:${toISO(start)}:${toISO(end)}` }));
    } else {
      setSellerFilters(f => ({ ...f, dateRange: `last-${preset}` }));
    }
  };
  useEffect(() => {
    if (!showSellerDatePicker) return;
    const handler = (e: MouseEvent) => {
      if (!sellerDateDropdownRef.current) return;
      if (!sellerDateDropdownRef.current.contains(e.target as Node)) setShowSellerDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSellerDatePicker]);

  // Reset selected cities when province changes
  useEffect(() => {
    setAdminSelectedCityCodes(new Set());
  }, [adminFilters.province]);

  // Admin City dropdown popover useEffect
  useEffect(() => {
    if (!showAdminCityDropdown) return;
    const handler = (e: MouseEvent) => {
      if (!adminCityDropdownRef.current) return;
      if (!adminCityDropdownRef.current.contains(e.target as Node)) setShowAdminCityDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdminCityDropdown]);

  // Derived admin seller rows based on Shop Name filter
  const adminSellersDisplayed = useMemo(() => {
    const sel = adminFilters.seller;
    if (!sel || sel === 'all') return adminSellers;
    return adminSellers.filter(s => s.uid === sel);
  }, [adminFilters.seller, adminSellers]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        activeItem={activeItem}
        onItemClick={setActiveItem}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
        />
        <main className="flex-1 p-6 animate-fade-in">
          {/* Notification will handle prompting; no inline prompt here */}
          {getPageContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;