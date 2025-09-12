import { useState } from "react";
import { Order } from "../../types/order.ts";

interface ConfirmationTabProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onConfirmOrder: (orderId: string) => Promise<void>;
  onRejectOrder: (orderId: string) => Promise<void>;
  onExportConfirmations: (format: string) => Promise<void>;
  onTabChange: (tab: string) => void;
}

const ConfirmationTab = ({ 
  orders, 
  loading, 
  error, 
  setError,
  onConfirmOrder,
  onRejectOrder,
  onExportConfirmations,
  onTabChange 
}: ConfirmationTabProps) => {
  
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");

  // Filter orders based on selected criteria
  const filteredOrders = orders.filter(order => {
    if (selectedPriority && order.priority !== selectedPriority) return false;
    if (selectedCustomer && !order.customer.name.toLowerCase().includes(selectedCustomer.toLowerCase())) return false;
    return true;
  });

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

      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Orders Ready for Confirmation</h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {filteredOrders.length} Pending
          </span>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select 
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="priority">Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          
          <input
            type="text"
            placeholder="Search customer..."
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          
          {orders.length > 0 && (
            <select 
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              onChange={(e) => e.target.value && onExportConfirmations(e.target.value)}
              value=""
            >
              <option value="">Export</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          )}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Loading orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">No Orders Awaiting Confirmation</p>
          <p className="text-gray-500 mb-4">
            Orders will appear here after they have been processed and are ready for final confirmation.
          </p>
          <button 
            onClick={() => onTabChange("process")}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            View Processing Queue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const priorityBadge = getPriorityBadge(order.priority);
            const packageTheme = getPackageTheme(order.package.size);
            
            return (
              <div key={order.id} className={`${packageTheme.bg} ${packageTheme.border} border rounded-xl p-6`}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Info */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-lg font-semibold ${packageTheme.text}`}>Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          Scanned {formatTimeAgo(order.timestamp)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.bg} ${priorityBadge.text}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-gray-600">Items:</span>
                        <span className={`ml-1 font-medium ${packageTheme.accent}`}>{order.orderCount}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        <span className="text-gray-600">Barcode:</span>
                        <span className="ml-1 font-mono text-xs">{order.barcode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Package Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Customer</h4>
                      <p className={`text-sm font-medium ${packageTheme.text}`}>{order.customer.name}</p>
                      <p className="text-xs text-gray-500">{order.customer.contact}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Package Details</h4>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <span className="text-gray-500 w-16">Size:</span>
                          <span className={`font-medium capitalize ${packageTheme.accent}`}>{order.package.size}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="text-gray-500 w-16">Dims:</span>
                          <span className="text-gray-700">{order.package.dimensions}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <span className="text-gray-500 w-16">Weight:</span>
                          <span className="text-gray-700">{order.package.weight}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col justify-center space-y-3">
                    <button 
                      onClick={() => onConfirmOrder(order.id)}
                      disabled={loading}
                      className="flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Order
                    </button>
                    
                    <button 
                      onClick={() => onRejectOrder(order.id)}
                      disabled={loading}
                      className="flex items-center justify-center px-4 py-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Order
                    </button>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center">
                        Processing completed
                      </p>
                      <p className="text-xs text-gray-400 text-center">
                        Ready for final confirmation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConfirmationTab;
