import { Order } from "../../types/order.ts";

interface CompletedTabProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onExport: (format: string) => Promise<void>;
  onViewDetails: (orderId: string) => Promise<void>;
  onDownloadInvoice: (orderId: string) => Promise<void>;
  onTabChange: (tab: string) => void;
}

const CompletedTab = ({ 
  orders, 
  loading, 
  error, 
  setError,
  onExport,
  onViewDetails,
  onDownloadInvoice,
  onTabChange 
}: CompletedTabProps) => {
  
  const getPriorityBadge = (priority: string) => {
    const badges = {
      normal: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Normal' },
      priority: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Priority' },
      urgent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgent' }
    };
    return badges[priority as keyof typeof badges] || badges.normal;
  };

  const getPackageTheme = (size: string) => {
    const themes = {
      small: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', accent: 'text-green-600' },
      medium: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', accent: 'text-teal-600' },
      large: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', accent: 'text-purple-600' }
    };
    return themes[size as keyof typeof themes] || themes.medium;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    return `${diffInHours} hours ago`;
  };

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

      {/* Completed Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Completed Orders</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {orders.length} completed
          </span>
        </div>
        
        {/* Filters and Export Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Filters */}
          <div className="flex items-center space-x-3">
            <div className="text-sm font-medium text-gray-700">FILTERS</div>
            <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="">SELECT DATE</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="">SELECT STATUS</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          
          {/* Export Section */}
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-700">EXPORT</div>
            <div className="relative">
              <select 
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-8"
                onChange={(e) => e.target.value && onExport(e.target.value)}
                value=""
              >
                <option value="">Choose Format</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Completed</p>
              <p className="text-2xl font-bold text-green-900">{orders.length}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Today's Orders</p>
              <p className="text-2xl font-bold text-blue-900">{orders.filter(order => {
                const today = new Date().toDateString();
                const orderDate = new Date(order.timestamp).toDateString();
                return today === orderDate;
              }).length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-purple-900">2.5h</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Success Rate</p>
              <p className="text-2xl font-bold text-orange-900">98.5%</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Loading completed orders...</span>
        </div>
      )}

      {/* Completed Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const priorityBadge = getPriorityBadge(order.priority);
            const packageTheme = getPackageTheme(order.package.size);
            
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Order Details */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Count</span>
                        {order.priority !== 'normal' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.bg} ${priorityBadge.text}`}>
                            {priorityBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{order.orderCount}</p>
                      <p className="text-sm text-gray-500">Completed: {formatTimeAgo(order.timestamp)}</p>
                    </div>

                    {/* Package Details */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Package Size</span>
                      <div className={`${packageTheme.bg} border ${packageTheme.border} rounded-lg p-3`}>
                        <p className={`text-sm font-medium ${packageTheme.text} capitalize`}>{order.package.size} Package</p>
                        <p className={`text-xs ${packageTheme.accent}`}>{order.package.dimensions}</p>
                        <p className={`text-xs ${packageTheme.accent}`}>Weight: {order.package.weight}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</span>
                      <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                      <p className="text-xs text-gray-500">Order ID: #{order.id}</p>
                      <p className="text-xs text-gray-500">Contact: {order.customer.contact}</p>
                    </div>

                    {/* Tracking Info */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tracking</span>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">TRK-{order.id.slice(-6).toUpperCase()}</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Delivered
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Est. delivery: 2-3 days</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</span>
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => onViewDetails(order.id)}
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => onDownloadInvoice(order.id)}
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Download Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No completed orders yet</h3>
          <p className="text-gray-500 mb-4">Processed orders will appear here once they're completed</p>
          <button 
            onClick={() => onTabChange("process")}
            className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            Go to Process Tab
          </button>
        </div>
      )}

      {/* Pagination (when there are many orders) */}
      {!loading && orders.length > 10 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex items-center text-sm text-gray-500">
            Showing 1-{Math.min(10, orders.length)} of {orders.length} orders
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Previous
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg">
              1
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              2
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedTab;
