import { useState } from "react";
import { Order } from "../../types/order.ts";

interface ProcessTabProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onPrintWaybill: (orderId: string) => Promise<void>;
  onMarkComplete: (orderId: string) => Promise<void>;
  onProcessAll: () => Promise<void>;
  onTabChange: (tab: string) => void;
}

const ProcessTab = ({ 
  orders, 
  loading, 
  error, 
  setError,
  onPrintWaybill,
  onMarkComplete,
  onProcessAll,
  onTabChange 
}: ProcessTabProps) => {
  
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

      {/* Process Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Orders to Process</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {orders.length} pending
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Sort by Date
          </button>
          <button 
            onClick={onProcessAll}
            disabled={loading || orders.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Process All"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Loading orders...</span>
        </div>
      )}

      {/* Processing Queue */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const priorityBadge = getPriorityBadge(order.priority);
            const packageTheme = getPackageTheme(order.package.size);
            
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
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
                      <p className="text-sm text-gray-500">Scanned: {formatTimeAgo(order.timestamp)}</p>
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

                    {/* Status & Actions */}
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</span>
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => onPrintWaybill(order.id)}
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Print Waybill
                        </button>
                        <button 
                          onClick={() => onMarkComplete(order.id)}
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Mark Complete
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

      {/* Empty State (when no orders) */}
      {!loading && orders.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders to process</h3>
          <p className="text-gray-500 mb-4">Orders from the scan tab will appear here for processing</p>
          <button 
            onClick={() => onTabChange("scan")}
            className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            Go to Scan Tab
          </button>
        </div>
      )}
    </div>
  );
};

export default ProcessTab;
