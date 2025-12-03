import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Banknote, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getAllWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
} from "@/services/withdrawal";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types/withdrawal";

interface WithdrawalTabProps {
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onApproveWithdrawal: (withdrawalId: string) => Promise<void>;
  onRejectWithdrawal: (withdrawalId: string) => Promise<void>;
  onExportWithdrawals: (format: string) => Promise<void>;
  onTabChange: (tab: string) => void;
}

const WithdrawalTab = ({
  loading: externalLoading,
  error: externalError,
  setError,
  onTabChange,
}: WithdrawalTabProps) => {
  const { uid } = useAuth();

  // Local state
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"pending" | "history">("pending");

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all withdrawal requests
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setFetchingRequests(true);
    try {
      const requests = await getAllWithdrawalRequests();
      setWithdrawalRequests(requests);
      setLocalError(null);
    } catch (error: any) {
      console.error("Error fetching withdrawal requests:", error);
      setLocalError("Failed to load withdrawal requests");
    } finally {
      setFetchingRequests(false);
    }
  };

  const currency = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  });

  // Filtered requests based on section and filters
  const filteredRequests = useMemo(() => {
    let filtered = withdrawalRequests;

    // Filter by section
    if (activeSection === "pending") {
      filtered = filtered.filter((r) => r.status === "pending");
    } else {
      filtered = filtered.filter((r) => r.status !== "pending");
    }

    // Filter by status (for history section)
    if (activeSection === "history" && selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.sellerName.toLowerCase().includes(query) ||
          r.sellerEmail.toLowerCase().includes(query) ||
          r.referenceNumber?.toLowerCase().includes(query) ||
          r.receiver.bankAccountName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [withdrawalRequests, activeSection, selectedStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const pending = withdrawalRequests.filter((r) => r.status === "pending");
    const approved = withdrawalRequests.filter((r) => r.status === "approved");
    const processing = withdrawalRequests.filter((r) => r.status === "processing");
    const completed = withdrawalRequests.filter((r) => r.status === "completed");
    const rejected = withdrawalRequests.filter((r) => r.status === "rejected");

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.amount, 0),
      approvedCount: approved.length + processing.length,
      completedCount: completed.length,
      completedAmount: completed.reduce((sum, r) => sum + r.amount, 0),
      rejectedCount: rejected.length,
    };
  }, [withdrawalRequests]);

  const getStatusBadge = (status: WithdrawalStatus) => {
    const badges: Record<WithdrawalStatus, { bg: string; text: string; label: string; icon: any }> = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Pending",
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

  const handleApprove = async (withdrawalId: string) => {
    if (!uid) return;

    setActionLoading(withdrawalId);
    setLocalError(null);

    try {
      const result = await approveWithdrawalRequest(withdrawalId, uid);
      if (result.success) {
        await fetchRequests();
      } else {
        setLocalError(result.error || "Failed to approve withdrawal");
      }
    } catch (error: any) {
      setLocalError(error.message || "Failed to approve withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (withdrawalId: string) => {
    setRejectingId(withdrawalId);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!uid || !rejectingId) return;

    if (!rejectionReason.trim()) {
      setLocalError("Please provide a reason for rejection");
      return;
    }

    setActionLoading(rejectingId);
    setLocalError(null);

    try {
      const result = await rejectWithdrawalRequest(rejectingId, uid, rejectionReason.trim());
      if (result.success) {
        setShowRejectModal(false);
        setRejectingId(null);
        setRejectionReason("");
        await fetchRequests();
      } else {
        setLocalError(result.error || "Failed to reject withdrawal");
      }
    } catch (error: any) {
      setLocalError(error.message || "Failed to reject withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage seller payout requests
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={fetchingRequests}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingRequests ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {(localError || externalError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{localError || externalError}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingCount}</p>
              <p className="text-xs text-yellow-700 mt-1">
                {currency.format(stats.pendingAmount)} total
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Approved / Processing</p>
              <p className="text-2xl font-bold text-blue-900">{stats.approvedCount}</p>
              <p className="text-xs text-blue-700 mt-1">Awaiting transfer</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{stats.completedCount}</p>
              <p className="text-xs text-green-700 mt-1">
                {currency.format(stats.completedAmount)} paid out
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{stats.rejectedCount}</p>
              <p className="text-xs text-red-700 mt-1">Declined requests</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
            activeSection === "pending"
              ? "text-white bg-teal-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveSection("pending")}
        >
          PENDING REQUESTS
          {stats.pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {stats.pendingCount}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
            activeSection === "history"
              ? "text-white bg-teal-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveSection("history")}
        >
          HISTORY
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by seller name, email, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          {activeSection === "history" && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {fetchingRequests && withdrawalRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-gray-500">Loading withdrawal requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Banknote className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              No {activeSection === "pending" ? "pending" : ""} withdrawal requests
            </p>
            <p className="text-sm text-gray-500">
              {activeSection === "pending"
                ? "New withdrawal requests from sellers will appear here"
                : "Processed withdrawal requests will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRequests.map((request) => {
              const statusBadge = getStatusBadge(request.status);
              const StatusIcon = statusBadge.icon;
              const isLoading = actionLoading === request.id;

              return (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${statusBadge.bg}`}
                      >
                        <StatusIcon className={`w-6 h-6 ${statusBadge.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">
                            {request.sellerName || "Unknown Seller"}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{request.sellerEmail}</p>
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Amount:</span>{" "}
                          <span className="text-lg font-bold text-gray-900">
                            {currency.format(request.amount)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">Bank:</span>{" "}
                          {request.receiver.bankName} • {request.receiver.bankAccountName} •{" "}
                          ****{request.receiver.bankAccountNumber.slice(-4)}
                        </div>
                        {request.referenceNumber && (
                          <div className="mt-1 text-xs text-gray-400">
                            Ref: {request.referenceNumber}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                          Requested: {formatDate(request.createdAt)}
                        </div>
                        {request.description && (
                          <div className="mt-1 text-xs text-gray-500 italic">
                            "{request.description}"
                          </div>
                        )}
                        {request.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                            <span className="font-medium">Rejection reason:</span>{" "}
                            {request.rejectionReason}
                          </div>
                        )}
                        {request.providerError && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                            <span className="font-medium">Provider error:</span>{" "}
                            {request.providerError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {request.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!request.id) return;
                            handleApprove(request.id);
                          }}
                          disabled={isLoading || !request.id}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              Approving...
                            </span>
                          ) : (
                            "Approve"
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (!request.id) return;
                            handleRejectClick(request.id);
                          }}
                          disabled={isLoading || !request.id}
                          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Status info for non-pending */}
                    {request.status !== "pending" && request.approvedAt && (
                      <div className="text-right text-xs text-gray-500">
                        <div>Approved: {formatDate(request.approvedAt)}</div>
                        {request.completedAt && (
                          <div className="text-green-600">
                            Completed: {formatDate(request.completedAt)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !actionLoading && setShowRejectModal(false)}
          />
          <div className="relative z-10 w-[92vw] max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Reject Withdrawal Request</h3>
              <p className="text-sm text-gray-500 mt-1">
                Please provide a reason for rejecting this request
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                disabled={!!actionLoading}
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={!!actionLoading || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Rejecting...
                    </span>
                  ) : (
                    "Confirm Rejection"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalTab;
