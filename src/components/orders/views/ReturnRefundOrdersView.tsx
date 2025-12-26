import React, { useState, useEffect } from 'react';
import { Order } from '@/types/order';
import OrdersService from '@/services/orders';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Upload,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

interface ReturnRequestData {
  id: string;
  orderId: string;
  order?: Order;
  requestId: string;
  customer: {
    name: string;
    email?: string;
  };
  product: {
    name: string;
    image?: string;
    quantity: number;
    price: number;
  };
  refundAmount: number;
  reason: string;
  status: RefundStatus;
  countdown: string | null;
  requestedAt: string;
  evidenceSubmitted: boolean;
  evidenceImages?: string[];
  responseMessage?: string;
  completedAt?: string;
}

interface ViewProps { 
  orders: Order[]; 
  onSelectOrder?: (o: Order) => void; 
}

const ReturnRefundOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder }) => {
  const [activeTab, setActiveTab] = useState<'all' | RefundStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequestData | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'evidence' | 'view'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [returnRequests, setReturnRequests] = useState<ReturnRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundPercentage, setRefundPercentage] = useState<number>(100);
  const [customRefundAmount, setCustomRefundAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  // Fetch return requests from orders with return_requested, return_approved, etc. statuses
  useEffect(() => {
    const loadReturnRequests = async () => {
      setLoading(true);
      try {
        const returnOrdersData: ReturnRequestData[] = [];
        
        // Filter orders with return-related statuses
        const returnOrders = orders.filter(o => 
          ['return_requested', 'return_approved', 'return_rejected', 'returned', 'refunded'].includes(o.status)
        );

        // Fetch return request data for each order
        for (const order of returnOrders) {
          if (order.returnRequestId) {
            const returnReq = await OrdersService.fetchReturnRequest(order.returnRequestId);
            
            if (returnReq) {
              // Calculate countdown if status is pending
              const requestedDate = returnReq.requestedAt 
                ? (typeof returnReq.requestedAt === 'string' 
                    ? new Date(returnReq.requestedAt)
                    : returnReq.requestedAt.toDate?.() || new Date(returnReq.requestedAt))
                : new Date();
              
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - requestedDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const remainingDays = Math.max(0, 7 - diffDays); // 7 day response window
              
              const countdown = returnReq.status === 'pending' && remainingDays > 0
                ? `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
                : null;

              // Get first item for display
              const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
              
              returnOrdersData.push({
                id: returnReq.id,
                orderId: order.id,
                order: order,
                requestId: order.returnRequestId,
                customer: {
                  name: order.customer.name,
                  email: order.customerId, // Could be enhanced with actual email
                },
                product: {
                  name: firstItem?.name || order.itemsBrief || 'Unknown Product',
                  image: firstItem?.imageUrl || order.imageUrl,
                  quantity: firstItem?.quantity || 1,
                  price: firstItem?.price || order.total || 0,
                },
                refundAmount: returnReq.orderTotal || order.total || 0,
                reason: returnReq.customReason || returnReq.reason,
                status: returnReq.status as RefundStatus,
                countdown,
                requestedAt: requestedDate.toISOString(),
                evidenceSubmitted: returnReq.evidenceSubmitted || false,
                evidenceImages: returnReq.evidenceImages,
                responseMessage: returnReq.responseMessage,
                completedAt: returnReq.completedAt 
                  ? (typeof returnReq.completedAt === 'string'
                      ? returnReq.completedAt
                      : returnReq.completedAt.toDate?.()?.toISOString() || new Date(returnReq.completedAt).toISOString())
                  : undefined,
              });
            }
          }
        }

        setReturnRequests(returnOrdersData);
      } catch (error) {
        console.error('Error loading return requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReturnRequests();
  }, [orders]);

  // Filter data by active tab
  const filteredData = activeTab === 'all' 
    ? returnRequests 
    : returnRequests.filter(item => item.status === activeTab);

  // Count for each tab
  const counts = {
    all: returnRequests.length,
    pending: returnRequests.filter(d => d.status === 'pending').length,
    approved: returnRequests.filter(d => d.status === 'approved').length,
    rejected: returnRequests.filter(d => d.status === 'rejected').length,
    completed: returnRequests.filter(d => d.status === 'completed').length,
  };

  const handleAction = (request: ReturnRequestData, action: typeof actionType) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
    setResponseMessage('');
    // Reset refund amount selection when opening dialog
    setRefundPercentage(100);
    setCustomRefundAmount('');
    setIsCustomAmount(false);
  };

  const handleSubmitAction = () => {
    const finalRefundAmount = isCustomAmount 
      ? parseFloat(customRefundAmount) || 0
      : (selectedRequest?.refundAmount || 0) * (refundPercentage / 100);
    
    // Validate refund amount
    if (actionType === 'approve') {
      if (finalRefundAmount <= 0) {
        alert('Refund amount must be greater than ₱0');
        return;
      }
      if (finalRefundAmount > (selectedRequest?.refundAmount || 0)) {
        alert('Refund amount cannot exceed the order total');
        return;
      }
    }
    
    console.log(`[${actionType}] Request:`, selectedRequest?.id, 
      'Message:', responseMessage, 
      'Refund Amount:', finalRefundAmount,
      'Original Amount:', selectedRequest?.refundAmount);
    
    alert(`Action "${actionType}" submitted for request ${selectedRequest?.requestId}\n` +
      (actionType === 'approve' ? `Refund Amount: ₱${finalRefundAmount.toFixed(2)} ${isCustomAmount ? '(Custom)' : `(${refundPercentage}%)`}` : ''));
    
    setShowActionDialog(false);
    setResponseMessage('');
    setRefundPercentage(100);
    setCustomRefundAmount('');
    setIsCustomAmount(false);
  };

  const calculateRefundAmount = () => {
    if (!selectedRequest) return 0;
    if (isCustomAmount) {
      return parseFloat(customRefundAmount) || 0;
    }
    return selectedRequest.refundAmount * (refundPercentage / 100);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Pending</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Rejected</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>;
    }
  };

  const getStatusIcon = (status: RefundStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <span className="ml-3 text-gray-600">Loading return requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-8 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'pending'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'approved'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({counts.approved})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'rejected'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({counts.rejected})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'completed'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({counts.completed})
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-blue-700">{counts.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-purple-700">{counts.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-700">{counts.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Request Cards */}
      <div className="space-y-4 px-6 pb-6">
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Return/Refund Requests</h3>
            <p className="text-gray-500">There are no return or refund requests in this category.</p>
          </div>
        ) : (
          filteredData.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow duration-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(request.status)}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Customer: {request.customer.name}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Request ID: {request.requestId} • Order ID: {request.orderId}
                      </p>
                      {request.countdown && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-flex">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">Respond in {request.countdown}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 bg-gray-50">
                <div className="flex items-start gap-4">
                  <img
                    src={request.product.image}
                    alt={request.product.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{request.product.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">x{request.product.quantity}</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Refund Amount</p>
                        <p className="text-lg font-bold text-red-600">₱{request.refundAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpand(request.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedItems.has(request.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedItems.has(request.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Return Reason:</p>
                      <p className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
                        {request.reason}
                      </p>
                    </div>

                    {request.evidenceSubmitted && request.evidenceImages && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Customer Evidence:</p>
                        <div className="flex gap-2">
                          {request.evidenceImages.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Evidence ${idx + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {request.responseMessage && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Your Response:</p>
                        <p className="text-sm text-gray-600 bg-teal-50 px-3 py-2 rounded-lg border border-teal-200">
                          {request.responseMessage}
                        </p>
                      </div>
                    )}

                    {request.completedAt && (
                      <div className="text-xs text-gray-500">
                        Completed on: {new Date(request.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {request.status !== 'completed' && (
                <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(request, 'reject')}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(request, 'approve')}
                        className="bg-teal-500 hover:bg-teal-600 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Refund
                      </Button>
                    </>
                  )}

                  {(request.status === 'approved' || request.status === 'rejected') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(request, 'view')}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Refund Request'}
              {actionType === 'reject' && 'Reject Refund Request'}
              {actionType === 'evidence' && 'Request Additional Evidence'}
              {actionType === 'view' && 'Request Details'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Confirm that you want to approve this refund request.'}
              {actionType === 'reject' && 'Please provide a reason for rejecting this request.'}
              {actionType === 'evidence' && 'Request additional evidence or information from the customer.'}
              {actionType === 'view' && 'View detailed information about this request.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <img
                    src={selectedRequest.product.image}
                    alt={selectedRequest.product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.product.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Request ID: {selectedRequest.requestId}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      Order Total: ₱{selectedRequest.refundAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Refund Amount Selection - Only show for approve action */}
            {actionType === 'approve' && selectedRequest && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 block">
                  Refund Amount
                </label>
                
                {/* Percentage Options */}
                <div className="grid grid-cols-4 gap-2">
                  {[100, 75, 50, 25].map((percentage) => (
                    <button
                      key={percentage}
                      type="button"
                      onClick={() => {
                        setRefundPercentage(percentage);
                        setIsCustomAmount(false);
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        !isCustomAmount && refundPercentage === percentage
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>

                {/* Custom Amount Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomAmount(!isCustomAmount);
                    if (!isCustomAmount) {
                      setCustomRefundAmount(selectedRequest.refundAmount.toString());
                    }
                  }}
                  className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    isCustomAmount
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Custom Amount
                </button>

                {/* Custom Amount Input */}
                {isCustomAmount && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                    <input
                      type="number"
                      min="0"
                      max={selectedRequest.refundAmount}
                      step="0.01"
                      value={customRefundAmount}
                      onChange={(e) => setCustomRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Refund Amount Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Total Refund Amount:</span>
                    <span className="text-lg font-bold text-blue-700">
                      ₱{calculateRefundAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {!isCustomAmount && refundPercentage < 100 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {refundPercentage}% of ₱{selectedRequest.refundAmount.toLocaleString()}
                    </p>
                  )}
                  {isCustomAmount && parseFloat(customRefundAmount) < selectedRequest.refundAmount && (
                    <p className="text-xs text-blue-600 mt-1">
                      Partial refund (Original: ₱{selectedRequest.refundAmount.toLocaleString()})
                    </p>
                  )}
                </div>

                {/* Warning for partial refunds */}
                {((isCustomAmount && parseFloat(customRefundAmount) < selectedRequest.refundAmount) || 
                  (!isCustomAmount && refundPercentage < 100)) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-medium">Partial Refund</p>
                      <p className="mt-1">Make sure to explain the partial refund reason to the customer in your message.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {actionType !== 'view' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  {actionType === 'approve' ? 'Message to Customer (Optional)' : 'Message to Customer'}
                </label>
                <Textarea
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g., Your refund has been approved and will be processed within 3-5 business days.'
                      : actionType === 'reject'
                      ? 'e.g., We cannot process your refund because...'
                      : 'e.g., Please provide clear photos of the damaged product.'
                  }
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
            >
              Cancel
            </Button>
            {actionType !== 'view' && (
              <Button
                onClick={handleSubmitAction}
                disabled={actionType === 'approve' && isCustomAmount && (!customRefundAmount || parseFloat(customRefundAmount) <= 0)}
                className={
                  actionType === 'approve'
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : actionType === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-500 hover:bg-amber-600'
                }
              >
                {actionType === 'approve' && (
                  selectedRequest ? 
                    `Approve ₱${calculateRefundAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Refund` : 
                    'Approve Refund'
                )}
                {actionType === 'reject' && 'Reject Request'}
                {actionType === 'evidence' && 'Request Evidence'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnRefundOrdersView;
