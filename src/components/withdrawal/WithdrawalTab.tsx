import { useState } from "react";

interface WithdrawalRequest {
  id: string;
  date: string;
  sellerName: string;
  withdrawalAmount: number;
  availableBalance: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  requestedDate: string;
  sellerId: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

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
  loading, 
  error, 
  setError,
  onApproveWithdrawal,
  onRejectWithdrawal,
  onExportWithdrawals,
  onTabChange 
}: WithdrawalTabProps) => {
  
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeSection, setActiveSection] = useState<'requests' | 'history'>('requests');

  // Mock withdrawal data - replace with API calls
  const [withdrawalRequests] = useState<WithdrawalRequest[]>([
    {
      id: "WD-2024-001",
      date: "2024-09-09",
      sellerName: "Dr. Sarah Johnson",
      withdrawalAmount: 25000.00,
      availableBalance: 45000.00,
      status: "pending",
      requestedDate: "2024-09-09T08:30:00Z",
      sellerId: "SELL-001",
      bankDetails: {
        accountName: "Dr. Sarah Johnson",
        accountNumber: "1234567890",
        bankName: "BPI Bank"
      }
    },
    {
      id: "WD-2024-002",
      date: "2024-09-09",
      sellerName: "Dr. Michael Chen",
      withdrawalAmount: 15000.00,
      availableBalance: 30000.00,
      status: "pending",
      requestedDate: "2024-09-09T09:15:00Z",
      sellerId: "SELL-002",
      bankDetails: {
        accountName: "Dr. Michael Chen",
        accountNumber: "0987654321",
        bankName: "Metrobank"
      }
    },
    {
      id: "WD-2024-003",
      date: "2024-09-08",
      sellerName: "Dr. Lisa Rodriguez",
      withdrawalAmount: 35000.00,
      availableBalance: 20000.00, // Insufficient balance
      status: "pending",
      requestedDate: "2024-09-08T14:20:00Z",
      sellerId: "SELL-003",
      bankDetails: {
        accountName: "Dr. Lisa Rodriguez",
        accountNumber: "5678901234",
        bankName: "BDO Bank"
      }
    }
  ]);

  const [withdrawalHistory] = useState<WithdrawalRequest[]>([
    {
      id: "WD-2024-004",
      date: "2024-09-07",
      sellerName: "Dr. James Wilson",
      withdrawalAmount: 20000.00,
      availableBalance: 50000.00,
      status: "completed",
      requestedDate: "2024-09-07T10:00:00Z",
      sellerId: "SELL-004"
    },
    {
      id: "WD-2024-005",
      date: "2024-09-06",
      sellerName: "Dr. Emma Thompson",
      withdrawalAmount: 12000.00,
      availableBalance: 25000.00,
      status: "rejected",
      requestedDate: "2024-09-06T16:30:00Z",
      sellerId: "SELL-005"
    }
  ]);

  // Filter withdrawals based on selected criteria
  const filteredRequests = withdrawalRequests.filter(request => {
    if (selectedDate && request.date !== selectedDate) return false;
    if (selectedSeller && !request.sellerName.toLowerCase().includes(selectedSeller.toLowerCase())) return false;
    if (selectedStatus && request.status !== selectedStatus) return false;
    return true;
  });

  const filteredHistory = withdrawalHistory.filter(request => {
    if (selectedDate && request.date !== selectedDate) return false;
    if (selectedSeller && !request.sellerName.toLowerCase().includes(selectedSeller.toLowerCase())) return false;
    if (selectedStatus && request.status !== selectedStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', dot: 'bg-yellow-400' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved', dot: 'bg-blue-400' },
      processing: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Processing', dot: 'bg-indigo-400' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', dot: 'bg-green-400' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', dot: 'bg-red-400' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP' 
    }).format(amount);
  };

  const isInsufficientBalance = (withdrawalAmount: number, availableBalance: number) => {
    return withdrawalAmount > availableBalance;
  };

  const WithdrawalTable = ({ 
    requests, 
    showActions = false 
  }: { 
    requests: WithdrawalRequest[], 
    showActions?: boolean 
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
          <span>Date</span>
          <span>Seller Name</span>
          <span>Withdrawal Amount</span>
          <span>Available Balance</span>
        </div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">No withdrawal {activeSection === 'requests' ? 'requests' : 'history'}</p>
            <p className="text-sm">
              {activeSection === 'requests' 
                ? "New withdrawal requests will appear here" 
                : "Processed withdrawals will be displayed in this section"
              }
            </p>
          </div>
        ) : (
          requests.map((request) => {
            const statusBadge = getStatusBadge(request.status);
            const insufficientBalance = isInsufficientBalance(request.withdrawalAmount, request.availableBalance);
            
            return (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-4 gap-4 items-center">
                  {/* Date */}
                  <div className="text-sm font-medium text-gray-900">
                    {request.date}
                  </div>
                  
                  {/* Seller Name */}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{request.sellerName}</p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${statusBadge.dot} mr-2`}></div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {request.bankDetails && (
                      <p className="text-xs text-gray-500 mt-1">
                        {request.bankDetails.bankName} • ****{request.bankDetails.accountNumber.slice(-4)}
                      </p>
                    )}
                  </div>
                  
                  {/* Withdrawal Amount */}
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(request.withdrawalAmount)}
                  </div>
                  
                  {/* Available Balance */}
                  <div className={`text-sm font-semibold ${
                    insufficientBalance ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(request.availableBalance)}
                  </div>
                </div>
                
                {/* Insufficient Balance Warning */}
                {insufficientBalance && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm font-medium text-red-800">
                        Insufficient Balance: Withdrawal amount exceeds available balance by {formatCurrency(request.withdrawalAmount - request.availableBalance)}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons (for requests only) */}
                {showActions && request.status === 'pending' && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => onApproveWithdrawal(request.id)}
                        disabled={loading || insufficientBalance}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {insufficientBalance ? 'Insufficient Balance' : 'Approve & Transfer'}
                      </button>
                      <button 
                        onClick={() => onRejectWithdrawal(request.id)}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject Request
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Requested: {new Date(request.requestedDate).toLocaleString()}
                    </div>
                  </div>
                )}
                
                {/* Bank Transfer Info for Approved/Processing */}
                {showActions && (request.status === 'approved' || request.status === 'processing') && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-sm font-medium text-blue-800">
                          {request.status === 'approved' ? 'Approved - Ready for Transfer' : 'Transfer in Progress'}
                        </span>
                      </div>
                      {request.bankDetails && (
                        <div className="text-xs text-blue-600">
                          {request.bankDetails.accountName} • {request.bankDetails.bankName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">WITHDRAWAL</h2>
        </div>
        
        {/* Filters Section */}
        <div className="flex items-center space-x-4 bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-700 uppercase tracking-wide">Filters</div>
          
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">Select Date</option>
            <option value="2024-09-09">Today (Sep 9, 2024)</option>
            <option value="2024-09-08">Yesterday (Sep 8, 2024)</option>
            <option value="2024-09-07">Sep 7, 2024</option>
            <option value="2024-09-06">Sep 6, 2024</option>
          </select>
          
          <input
            type="text"
            placeholder="Select Seller"
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          />
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">Select Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-900">
                {withdrawalRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Processing</p>
              <p className="text-2xl font-bold text-blue-900">
                {withdrawalRequests.filter(r => r.status === 'approved' || r.status === 'processing').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed Today</p>
              <p className="text-2xl font-bold text-green-900">
                {withdrawalHistory.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Total Amount</p>
              <p className="text-2xl font-bold text-teal-900">
                {formatCurrency([...withdrawalRequests, ...withdrawalHistory]
                  .filter(r => r.status === 'completed')
                  .reduce((sum, r) => sum + r.withdrawalAmount, 0)
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
        <button 
          className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
            activeSection === "requests" 
              ? "text-white bg-teal-600" 
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setActiveSection("requests")}
        >
          REQUESTS
          {filteredRequests.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {filteredRequests.length}
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Processing withdrawal...</span>
        </div>
      )}

      {/* Content Sections */}
      {!loading && (
        <>
          {activeSection === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Withdrawal Requests</h3>
                <div className="text-sm text-gray-500">
                  {filteredRequests.length} requests requiring review
                </div>
              </div>
              <WithdrawalTable requests={filteredRequests} showActions={true} />
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Withdrawal History</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{filteredHistory.length} processed</span>
                  <select 
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    onChange={(e) => e.target.value && onExportWithdrawals(e.target.value)}
                    value=""
                  >
                    <option value="">Export</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
              <WithdrawalTable requests={filteredHistory} showActions={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WithdrawalTab;
