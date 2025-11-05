import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RevenueChart from "@/components/dashboard/RevenueChart";
import Booking from "@/pages/Booking";
import ConfirmationTab from "@/components/confirmation/ConfirmationTab";
import WithdrawalTab from "@/components/withdrawal/WithdrawalTab";
import AccessTab from "@/components/access/AccessTab";
import ImagesTab from "@/components/images/ImagesTab";
import UsersTab from "@/components/users/UsersTab";
import OrderTab from '@/components/orders/SellerOrdersTab';
import InventoryTab from '@/components/inventory/InventoryTab';
import ProductQCTab from '@/components/admin/ProductQCTab';
import { Order } from "@/types/order";
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react";
// Add permission-aware auth hook
import { useAuth } from "@/hooks/use-auth";
import SellerProfileTab from '@/components/profile/SellerProfileTab';
import ReportsTab from '@/components/reports/ReportsTab';
import OrdersService from '@/services/orders';
import AddProduct from '@/pages/AddProduct'; // New
import NotificationsTab from '@/components/notifications/NotificationsTab';
import { useLocation, useNavigate } from 'react-router-dom';
import WarrantyManager from '@/pages/admin/WarrantyManager';

interface DashboardProps {
  user: { name?: string; email: string };
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { hasPermission, loading: authLoading } = useAuth();
  const { isAdmin } = useAuth();
  const { uid } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // New: seller dashboard UI state
  const [showTutorial, setShowTutorial] = useState(false);
  const [sellerFilters, setSellerFilters] = useState({
    dateRange: "last-30",
    brand: "all",
    subcategory: "all",
    location: "all",
    paymentType: "all",
  });

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

  const isPaidStatus = (s: Order['status']) => ['to-ship','processing','completed'].includes(s);
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
  useEffect(() => {
    try {
      if (!activeItem) return;
      const params = new URLSearchParams(location.search);
      const current = params.get('tab');
      if (current !== activeItem) {
        params.set('tab', activeItem);
        navigate({ pathname: location.pathname || '/', search: params.toString() }, { replace: true });
      }
    } catch {}
  }, [activeItem]);

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
  } as any;

  const isAllowed = (itemId: string) => hasPermission((permissionByMenuId[itemId] || 'dashboard') as any);

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

              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Average sale per transaction</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{currency.format(kpiMetrics.avgSalePerTxn)}</div>
                  <div className="mt-1 text-xs text-gray-500">Last {sellerFilters.dateRange.replace('last-','')} days</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Number of receipts</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{kpiMetrics.receipts.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-gray-500">Paid orders</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <div className="text-sm font-medium text-gray-700">Logistics fee to pay</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{currency.format(kpiMetrics.logisticsDue)}</div>
                  <div className="mt-1 text-xs text-gray-500">Shipping + fees</div>
                </div>
                {/* New KPI: Average completion time */}
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
                    <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={sellerFilters.dateRange} onChange={(e)=> setSellerFilters(f=>({ ...f, dateRange: e.target.value }))}>
                      <option value="last-7">Last 7 days</option>
                      <option value="last-30">Last 30 days</option>
                      <option value="last-90">Last 90 days</option>
                      <option value="last-365">Last year</option>
                    </select>
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
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select location</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={sellerFilters.location} onChange={(e)=> setSellerFilters(f=>({ ...f, location: e.target.value }))}>
                      <option value="all">All locations</option>
                      <option value="ncr">NCR</option>
                      <option value="luzon">Luzon</option>
                      <option value="visayas">Visayas</option>
                      <option value="mindanao">Mindanao</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Select payment type</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent" value={sellerFilters.paymentType} onChange={(e)=> setSellerFilters(f=>({ ...f, paymentType: e.target.value }))}>
                      <option value="all">All payment types</option>
                      {paymentTypeOptions.map(pt => (
                        <option key={pt} value={pt}>{pt}</option>
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
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ORDER SHIPPED</p>
                    <p className="text-sm text-gray-500 mb-2">NUMBER OF DELIVERED TRANSACTIONS</p>
                    <p className="text-2xl font-bold text-gray-900">(average order)</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>
              {/* Total Transactions Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">TOTAL NUMBER OF</p>
                    <p className="text-sm text-gray-500 mb-2">DELIVERED TRANSACTIONS</p>
                    <p className="text-2xl font-bold text-gray-900">(total transactions)</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              {/* Active Users Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ACTIVE USERS</p>
                    <p className="text-sm text-gray-500 mb-2">(active users count per day)</p>
                    <p className="text-2xl font-bold text-gray-900">24,567</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
            {/* Horizontal Filters Bar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 gap-4">
                {/* Date Filter */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">DATE RANGE</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>Select date range</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                    <option>Last year</option>
                  </select>
                </div>
                {/* Payment Method */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAYMENT METHOD</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All payment methods</option>
                    <option>Credit Card</option>
                    <option>Cash</option>
                    <option>Insurance</option>
                  </select>
                </div>
                {/* Payment Type */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAYMENT TYPE</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All payment types</option>
                    <option>Full Payment</option>
                    <option>Partial Payment</option>
                    <option>Installment</option>
                  </select>
                </div>
                {/* Location */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">LOCATION</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All locations</option>
                    <option>Main Clinic</option>
                    <option>Branch 1</option>
                    <option>Branch 2</option>
                  </select>
                </div>
                {/* Seller */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">DENTIST</label>
                  <select className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option>All dentists</option>
                    <option>Dr. Smith</option>
                    <option>Dr. Johnson</option>
                    <option>Dr. Williams</option>
                  </select>
                </div>
                {/* Apply / Reset */}
                <div className="flex items-end gap-2 pt-2">
                  <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-sm transition">Apply</button>
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition">Reset</button>
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
      default:
        return "";
    }
  };

  // Live Orders subscription for Orders tab
  useEffect(() => {
    if (!uid) return;
    let unsub: (() => void) | undefined;
    if (isAdmin) {
      unsub = OrdersService.listenAll(setConfirmationOrders);
    } else {
      unsub = OrdersService.listenBySeller(uid, setConfirmationOrders);
    }
    return () => { try { unsub && unsub(); } catch {} };
  }, [uid, isAdmin]);

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