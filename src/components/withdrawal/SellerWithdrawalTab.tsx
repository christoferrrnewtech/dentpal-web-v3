import { useState, useMemo, useEffect, useRef } from "react";
import { Wallet, CreditCard, Truck, Receipt, DollarSign, Clock, CheckCircle, AlertCircle, Banknote, XCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { 
  createWithdrawalRequest, 
  getSellerWithdrawalRequests 
} from "@/services/withdrawal";
import SellersService from "@/services/sellers";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types/withdrawal";
import { PHILIPPINE_BANKS } from "@/types/withdrawal";

interface SellerWithdrawalTabProps {
  financialMetrics: {
    totalGross: number;
    totalNetPayout: number;
    totalPaymentProcessingFee: number;
    totalPlatformFee: number;
    totalShippingCharge: number;
  };
  sellerFilters: {
    dateRange: string;
    brand: string;
    subcategory: string;
    location: string;
    paymentType: string;
  };
  onFiltersChange: (filters: any) => void;
  loading?: boolean;
}

const SellerWithdrawalTab = ({
  financialMetrics,
  sellerFilters,
  onFiltersChange,
  loading = false,
}: SellerWithdrawalTabProps) => {
  const { uid } = useAuth();
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  
  // Form states
  const [requestAmount, setRequestAmount] = useState<string>("");
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  
  // Withdrawal requests from Firestore
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);
  
  // Status filter for withdrawal history
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper functions for calendar
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const firstWeekday = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const isInRange = (day: Date) => {
    if (!dateRange.start || !dateRange.end) return false;
    const t = day.getTime();
    return t >= dateRange.start.getTime() && t <= dateRange.end.getTime();
  };

  const handleDayClick = (day: Date) => {
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      setDateRange({ start: day, end: null });
    } else {
      if (day >= dateRange.start) {
        setDateRange({ ...dateRange, end: day });
      } else {
        setDateRange({ start: day, end: dateRange.start });
      }
    }
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (preset === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDateRange({ start: today, end: now });
      onFiltersChange({ ...sellerFilters, dateRange: 'today' });
      setShowDatePicker(false);
    } else {
      const days = parseInt(preset);
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      setDateRange({ start, end: now });
      onFiltersChange({ ...sellerFilters, dateRange: `last-${days}` });
      setShowDatePicker(false);
    }
  };

  const applyRange = () => {
    if (dateRange.start) {
      const end = dateRange.end || dateRange.start;
      // Format: custom:YYYY-MM-DD:YYYY-MM-DD
      const customKey = `custom:${toISO(dateRange.start)}:${toISO(end)}`;
      onFiltersChange({ ...sellerFilters, dateRange: customKey });
      setShowDatePicker(false);
    }
  };

  // Fetch seller's withdrawal requests on mount
  useEffect(() => {
    const fetchRequests = async () => {
      if (!uid) return;
      
      setFetchingRequests(true);
      try {
        const requests = await getSellerWithdrawalRequests(uid);
        setWithdrawalRequests(requests);
      } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
      } finally {
        setFetchingRequests(false);
      }
    };

    fetchRequests();
  }, [uid]);

  const refreshRequests = async () => {
    if (!uid) return;
    
    setFetchingRequests(true);
    try {
      const requests = await getSellerWithdrawalRequests(uid);
      setWithdrawalRequests(requests);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    } finally {
      setFetchingRequests(false);
    }
  };

  const currency = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  });

  // Calculate available balance (Net Payout minus pending/processing/approved requests)
  const pendingAmount = useMemo(() => {
    return withdrawalRequests
      .filter((r) => r.status === "pending" || r.status === "processing" || r.status === "approved")
      .reduce((sum, r) => sum + r.amount, 0);
  }, [withdrawalRequests]);

  const availableBalance = useMemo(() => {
    return Math.max(0, financialMetrics.totalNetPayout - pendingAmount);
  }, [financialMetrics.totalNetPayout, pendingAmount]);

  // Filtered withdrawal requests based on status filter
  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return withdrawalRequests;
    return withdrawalRequests.filter((r) => r.status === statusFilter);
  }, [withdrawalRequests, statusFilter]);

  // Count requests by status for filter badges
  const statusCounts = useMemo(() => {
    return {
      all: withdrawalRequests.length,
      pending: withdrawalRequests.filter((r) => r.status === "pending").length,
      approved: withdrawalRequests.filter((r) => r.status === "approved").length,
      processing: withdrawalRequests.filter((r) => r.status === "processing").length,
      completed: withdrawalRequests.filter((r) => r.status === "completed").length,
      rejected: withdrawalRequests.filter((r) => r.status === "rejected").length,
      failed: withdrawalRequests.filter((r) => r.status === "failed").length,
    };
  }, [withdrawalRequests]);

  const getStatusBadge = (status: WithdrawalStatus) => {
    const badges: Record<WithdrawalStatus, { bg: string; text: string; label: string; icon: any }> = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Pending Approval",
        icon: Clock,
      },
      approved: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Approved",
        icon: CheckCircle,
      },
      processing: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        label: "Processing",
        icon: RefreshCw,
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Completed",
        icon: CheckCircle,
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Rejected",
        icon: XCircle,
      },
      failed: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Failed",
        icon: AlertCircle,
      },
    };
    return badges[status] || badges.pending;
  };

  const resetForm = () => {
    setRequestAmount("");
    setBankAccountName("");
    setBankAccountNumber("");
    setSelectedBank("");
    setDescription("");
    setRequestError(null);
  };

  const handleRequestPayout = async () => {
    // Runtime guard: ensure uid is available before proceeding
    if (!uid) {
      setRequestError("User not authenticated. Please log in and try again.");
      return;
    }

    const amount = parseFloat(requestAmount);
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      setRequestError("Please enter a valid amount");
      return;
    }

    if (amount > availableBalance) {
      setRequestError("Amount exceeds available balance");
      return;
    }

    if (amount < 100) {
      setRequestError("Minimum withdrawal amount is ₱100");
      return;
    }

    if (!bankAccountName.trim()) {
      setRequestError("Please enter the bank account name");
      return;
    }

    if (!bankAccountNumber.trim()) {
      setRequestError("Please enter the bank account number");
      return;
    }

    if (bankAccountNumber.length < 10) {
      setRequestError("Bank account number must be at least 10 digits");
      return;
    }

    if (!selectedBank) {
      setRequestError("Please select a bank");
      return;
    }

    const bank = PHILIPPINE_BANKS.find(b => b.code === selectedBank);
    if (!bank) {
      setRequestError("Invalid bank selection");
      return;
    }

    setRequestLoading(true);
    setRequestError(null);

    try {
      // Fetch seller info from Seller collection
      const sellerProfile = await SellersService.get(uid);
      const sellerName = sellerProfile?.name || sellerProfile?.vendor?.company?.name || bankAccountName;
      const sellerEmail = sellerProfile?.email || sellerProfile?.vendor?.contacts?.email || "";

      const result = await createWithdrawalRequest(
        uid,
        sellerName,
        sellerEmail,
        {
          amount,
          description: description.trim() || undefined,
          receiver: {
            bankAccountName: bankAccountName.trim(),
            bankAccountNumber: bankAccountNumber.trim(),
            bankCode: bank.code,
            bankId: bank.id,
            bankName: bank.name,
          },
        }
      );

      if (result.success) {
        setRequestSuccess(true);
        resetForm();
        
        // Refresh the requests list
        await refreshRequests();
        
        // Auto close modal after success
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestSuccess(false);
        }, 2500);
      } else {
        setRequestError(result.error || "Failed to create withdrawal request");
      }
    } catch (err: any) {
      setRequestError(err.message || "Failed to create payout request. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (!requestLoading) {
      setShowRequestModal(false);
      setRequestSuccess(false);
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Withdrawal</h2>
          <p className="text-sm text-gray-500 mt-1">
            View your earnings summary and request payouts (completed orders only)
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          disabled={availableBalance < 100}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Banknote className="w-4 h-4" />
          Request Payout
        </button>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-blue-600 mt-0.5">
            ℹ️
          </div>
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium">
              Withdrawal Policy
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Only funds from orders with <span className="font-semibold">'Completed'</span> status are available for withdrawal. 
              Orders must be delivered and confirmed before the payout becomes available.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Receipt className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Gross Sales</div>
              <div className="text-xl font-bold text-gray-900">
                {currency.format(financialMetrics.totalGross)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total subtotal from completed orders
          </div>
        </div>

        {/* Net Payout */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Net Payout</div>
              <div className="text-xl font-bold text-green-600">
                {currency.format(financialMetrics.totalNetPayout)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">From completed orders only</div>
        </div>

        {/* Payment Processing Fee */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">
                Payment Processing Fee
              </div>
              <div className="text-xl font-bold text-red-600">
                {currency.format(financialMetrics.totalPaymentProcessingFee)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total payment gateway fees
          </div>
        </div>

        {/* Platform Fee */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Platform Fee</div>
              <div className="text-xl font-bold text-red-600">
                {currency.format(financialMetrics.totalPlatformFee)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total platform commission
          </div>
        </div>

        {/* Shipping Charge */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">
                Shipping Charge
              </div>
              <div className="text-xl font-bold text-orange-600">
                {currency.format(financialMetrics.totalShippingCharge)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Seller portion of shipping
          </div>
        </div>
      </div>

      {/* Available Balance Card */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-teal-100">
              Available Balance for Withdrawal
            </div>
            <div className="text-3xl font-bold mt-1">
              {currency.format(availableBalance)}
            </div>
            <div className="text-xs text-teal-100 mt-2 italic">
              Only funds from completed orders are available for withdrawal
            </div>
            {pendingAmount > 0 && (
              <div className="text-sm text-teal-100 mt-2">
                {currency.format(pendingAmount)} pending in payout requests
              </div>
            )}
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-gray-900 mb-3">Filters</div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select date
            </label>
            <div ref={dateDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowDatePicker(v => !v)}
                aria-haspopup="dialog"
                aria-expanded={showDatePicker}
                className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="truncate pr-2">
                  {(() => {
                    if (dateRange.start) {
                      return `${toISO(dateRange.start)} → ${toISO(dateRange.end || dateRange.start)}`;
                    }
                    if (sellerFilters.dateRange.startsWith('custom:')) {
                      const parts = sellerFilters.dateRange.split(':');
                      if (parts.length === 3) {
                        return `${parts[1]} → ${parts[2]}`;
                      }
                    }
                    if (sellerFilters.dateRange === 'today') return 'Today';
                    if (sellerFilters.dateRange.includes('last-')) {
                      return 'Last ' + sellerFilters.dateRange.replace('last-','') + ' days';
                    }
                    return 'Select date range';
                  })()}
                </span>
                <span className={`text-[11px] transition-transform ${showDatePicker ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {showDatePicker && (
                <div className="absolute left-0 mt-2 z-30 w-[280px] border border-gray-200 rounded-xl bg-white shadow-xl p-3 space-y-3 animate-fade-in">
                  {/* Presets */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => applyPreset('today')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Today</button>
                    <button onClick={() => applyPreset('7')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 7 days</button>
                    <button onClick={() => applyPreset('30')} className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-teal-50">Last 30 days</button>
                    {dateRange.start && (
                      <span className="text-[10px] text-gray-500 ml-auto">{toISO(dateRange.start)} → {toISO(dateRange.end || dateRange.start)}</span>
                    )}
                  </div>
                  {/* Calendar header */}
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">◀</button>
                    <div className="text-xs font-medium text-gray-700">
                      {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button type="button" onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-100">▶</button>
                  </div>
                  {/* Weekday labels */}
                  <div className="grid grid-cols-7 text-[10px] font-medium text-gray-500">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}
                  </div>
                  {/* Days grid with range highlight */}
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {Array.from({ length: firstWeekday(calendarMonth) }).map((_,i) => <div key={'spacer'+i} />)}
                    {Array.from({ length: daysInMonth(calendarMonth) }).map((_,i) => {
                      const day = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i+1);
                      const selectedStart = dateRange.start && day.getTime() === dateRange.start.getTime();
                      const selectedEnd = dateRange.end && day.getTime() === dateRange.end.getTime();
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
                    <button type="button" onClick={() => { setDateRange({ start: null, end: null }); onFiltersChange({ ...sellerFilters, dateRange: 'last-30' }); }} className="text-[11px] px-2 py-1 rounded-md border bg-white hover:bg-gray-100">Clear</button>
                    <div className="flex gap-2">
                      <button type="button" onClick={applyRange} disabled={!dateRange.start} className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-40">Apply</button>
                      <button type="button" onClick={() => setShowDatePicker(false)} className="text-[11px] px-3 py-1 rounded-md border bg-white hover:bg-gray-100">Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end gap-2 pt-2">
            <button
              onClick={() =>
                onFiltersChange({
                  dateRange: "last-30",
                  brand: "all",
                  subcategory: "all",
                  location: "all",
                  paymentType: "all",
                })
              }
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Payout Requests History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payout Request History
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Track the status of your payout requests
            </p>
          </div>
          <button
            onClick={refreshRequests}
            disabled={fetchingRequests}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingRequests ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: "all", label: "All", color: "gray" },
              { key: "pending", label: "Pending", color: "yellow" },
              { key: "approved", label: "Approved", color: "blue" },
              { key: "processing", label: "Processing", color: "indigo" },
              { key: "completed", label: "Completed", color: "green" },
              { key: "rejected", label: "Rejected", color: "red" },
            ].map((tab) => {
              const count = statusCounts[tab.key as keyof typeof statusCounts];
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? tab.color === "yellow"
                        ? "bg-yellow-100 text-yellow-800"
                        : tab.color === "blue"
                        ? "bg-blue-100 text-blue-800"
                        : tab.color === "indigo"
                        ? "bg-indigo-100 text-indigo-800"
                        : tab.color === "green"
                        ? "bg-green-100 text-green-800"
                        : tab.color === "red"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-200 text-gray-800"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive ? "bg-white/50" : "bg-gray-100"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {fetchingRequests && withdrawalRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading withdrawal requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === "all" ? "No payout requests yet" : `No ${statusFilter} requests`}
            </p>
            <p className="text-sm text-gray-500">
              {statusFilter === "all" 
                ? "Your payout request history will appear here"
                : `You don't have any ${statusFilter} payout requests`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRequests.map((request) => {
              const statusBadge = getStatusBadge(request.status);
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={request.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${statusBadge.bg}`}
                      >
                        <StatusIcon className={`w-5 h-5 ${statusBadge.text}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {currency.format(request.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Requested on{" "}
                          {new Date(request.createdAt).toLocaleDateString(
                            "en-PH",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                      >
                        {statusBadge.label}
                      </span>
                      {request.referenceNumber && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ref: {request.referenceNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Bank:</span>{" "}
                    {request.receiver.bankName} •{" "}
                    {(() => {
                      const acctNum = request.receiver.bankAccountNumber || "";
                      const lastChars = acctNum.length >= 4 ? acctNum.slice(-4) : acctNum;
                      return "****" + lastChars;
                    })()}
                  </div>
                  {request.status === 'rejected' && request.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                      <span className="font-medium">Rejection reason:</span> {request.rejectionReason}
                    </div>
                  )}
                  {request.status === 'failed' && request.providerError && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                      <span className="font-medium">Error:</span> {request.providerError}
                    </div>
                  )}
                  {request.completedAt && (
                    <div className="mt-1 text-sm text-green-600">
                      Completed on{" "}
                      {new Date(request.completedAt).toLocaleDateString(
                        "en-PH",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseModal}
          />
          <div className="relative z-10 w-[92vw] max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                Request Payout
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the details to request a withdrawal
              </p>
            </div>

            <div className="p-6">
              {requestSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    Payout Request Submitted!
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your request is being reviewed by the admin team.
                  </p>
                </div>
              ) : (
                <>
                  {/* Available Balance */}
                  <div className="mb-6 p-4 bg-teal-50 rounded-xl">
                    <div className="text-sm text-teal-700 mb-1">
                      Available Balance
                    </div>
                    <div className="text-2xl font-bold text-teal-600">
                      {currency.format(availableBalance)}
                    </div>
                  </div>

                  {/* Withdrawal Amount */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Withdrawal Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        ₱
                      </span>
                      <input
                        type="number"
                        value={requestAmount}
                        onChange={(e) => {
                          setRequestAmount(e.target.value);
                          setRequestError(null);
                        }}
                        placeholder="0.00"
                        min="100"
                        max={availableBalance}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg text-lg font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        disabled={requestLoading}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Minimum withdrawal: ₱100
                    </div>
                  </div>

                  {/* Bank Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Bank <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => {
                        setSelectedBank(e.target.value);
                        setRequestError(null);
                      }}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={requestLoading}
                    >
                      <option value="">-- Select a bank --</option>
                      {PHILIPPINE_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Account Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => {
                        setBankAccountName(e.target.value);
                        setRequestError(null);
                      }}
                      placeholder="e.g., Juan Dela Cruz"
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={requestLoading}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Enter the name exactly as it appears on your bank account
                    </div>
                  </div>

                  {/* Bank Account Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '');
                        setBankAccountNumber(value);
                        setRequestError(null);
                      }}
                      placeholder="e.g., 1234567890"
                      maxLength={20}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                      disabled={requestLoading}
                    />
                  </div>

                  {/* Description (Optional) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Monthly payout"
                      maxLength={100}
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={requestLoading}
                    />
                  </div>

                  {/* Error Message */}
                  {requestError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-700">{requestError}</p>
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong>Note:</strong> Payout requests are processed
                        within 1-3 business days after admin approval. Please ensure
                        your bank details are correct. You will receive a notification
                        once your payout is completed.
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseModal}
                      disabled={requestLoading}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestPayout}
                      disabled={requestLoading || !uid || !requestAmount || !bankAccountName || !bankAccountNumber || !selectedBank}
                      className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requestLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Processing...
                        </span>
                      ) : (
                        "Submit Request"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerWithdrawalTab;
