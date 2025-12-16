import React, { useState } from 'react';
import { Order } from '@/types/order';
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
  ChevronUp
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

// Hard-coded mock data for return/refund requests
const MOCK_RETURN_REFUND_DATA = [
  {
    id: 'REF-001',
    orderId: 'DP-2024-1001',
    requestId: '210615163956635',
    customer: {
      name: 'Dr. Maria Santos',
      email: 'maria.santos@dentclinic.com',
    },
    product: {
      name: 'Dental Handpiece High Speed',
      image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200',
      quantity: 1,
      price: 2242,
    },
    refundAmount: 2242,
    reason: 'Received an incomplete product (missing quantity or accessories)',
    status: 'evidence_requested' as const,
    countdown: '1 day',
    requestedAt: '2024-12-14T10:30:00Z',
    evidenceSubmitted: false,
  },
  {
    id: 'REF-002',
    orderId: 'DP-2024-1002',
    requestId: '210615163956636',
    customer: {
      name: 'Dr. Juan Dela Cruz',
      email: 'juan.delacruz@smile.ph',
    },
    product: {
      name: 'Dental Composite Resin Kit',
      image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200',
      quantity: 2,
      price: 3500,
    },
    refundAmount: 7000,
    reason: 'Product defective or does not work',
    status: 'new_request' as const,
    countdown: '2 days',
    requestedAt: '2024-12-15T14:20:00Z',
    evidenceSubmitted: true,
    evidenceImages: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
    ],
  },
  {
    id: 'REF-003',
    orderId: 'DP-2024-1003',
    requestId: '210615163956637',
    customer: {
      name: 'Dr. Sofia Rodriguez',
      email: 'sofia.rodriguez@dental.com',
    },
    product: {
      name: 'Orthodontic Bracket Kit',
      image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=200',
      quantity: 1,
      price: 4200,
    },
    refundAmount: 4200,
    reason: 'Wrong product received',
    status: 'responded' as const,
    countdown: null,
    requestedAt: '2024-12-13T09:15:00Z',
    responseMessage: 'We have approved your refund request. The refund will be processed within 3-5 business days.',
    evidenceSubmitted: true,
  },
  {
    id: 'REF-004',
    orderId: 'DP-2024-1004',
    requestId: '210615163956638',
    customer: {
      name: 'Dr. Pedro Reyes',
      email: 'pedro.reyes@dentalcare.ph',
    },
    product: {
      name: 'Dental Suction Unit',
      image: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=200',
      quantity: 1,
      price: 8500,
    },
    refundAmount: 8500,
    reason: 'Product arrived damaged',
    status: 'completed' as const,
    countdown: null,
    requestedAt: '2024-12-10T11:00:00Z',
    completedAt: '2024-12-12T16:30:00Z',
    evidenceSubmitted: true,
  },
  {
    id: 'REF-005',
    orderId: 'DP-2024-1005',
    requestId: '210615163956639',
    customer: {
      name: 'Dr. Ana Lopez',
      email: 'ana.lopez@clinic.ph',
    },
    product: {
      name: 'Dental LED Curing Light',
      image: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=200',
      quantity: 1,
      price: 1850,
    },
    refundAmount: 1850,
    reason: 'Change of mind',
    status: 'to_respond' as const,
    countdown: '12 hours',
    requestedAt: '2024-12-15T18:45:00Z',
    evidenceSubmitted: false,
  },
];

type RefundStatus = 'new_request' | 'to_respond' | 'evidence_requested' | 'responded' | 'completed';

interface ViewProps { 
  orders: Order[]; 
  onSelectOrder?: (o: Order) => void; 
}

const ReturnRefundOrdersView: React.FC<ViewProps> = ({ orders, onSelectOrder }) => {
  const [activeTab, setActiveTab] = useState<'all' | RefundStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<typeof MOCK_RETURN_REFUND_DATA[0] | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'evidence' | 'view'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // TODO: Replace MOCK_RETURN_REFUND_DATA with real Firebase data from 'orders' prop
  // For now, we're using hard-coded dummy data for testing UI/UX
  console.log('🔴 ReturnRefundOrdersView loaded with', MOCK_RETURN_REFUND_DATA.length, 'mock requests');
  
  // Filter data by active tab
  const filteredData = activeTab === 'all' 
    ? MOCK_RETURN_REFUND_DATA 
    : MOCK_RETURN_REFUND_DATA.filter(item => item.status === activeTab);

  // Count for each tab
  const counts = {
    all: MOCK_RETURN_REFUND_DATA.length,
    new_request: MOCK_RETURN_REFUND_DATA.filter(d => d.status === 'new_request').length,
    to_respond: MOCK_RETURN_REFUND_DATA.filter(d => d.status === 'to_respond').length,
    evidence_requested: MOCK_RETURN_REFUND_DATA.filter(d => d.status === 'evidence_requested').length,
    responded: MOCK_RETURN_REFUND_DATA.filter(d => d.status === 'responded').length,
    completed: MOCK_RETURN_REFUND_DATA.filter(d => d.status === 'completed').length,
  };

  const handleAction = (request: typeof MOCK_RETURN_REFUND_DATA[0], action: typeof actionType) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowActionDialog(true);
    setResponseMessage('');
  };

  const handleSubmitAction = () => {
    console.log(`[${actionType}] Request:`, selectedRequest?.id, 'Message:', responseMessage);
    alert(`Action "${actionType}" submitted for request ${selectedRequest?.requestId}`);
    setShowActionDialog(false);
    setResponseMessage('');
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
      case 'new_request':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">New Request</span>;
      case 'to_respond':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">To Respond</span>;
      case 'evidence_requested':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Evidence Requested</span>;
      case 'responded':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Responded</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>;
    }
  };

  const getStatusIcon = (status: RefundStatus) => {
    switch (status) {
      case 'new_request':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'to_respond':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'evidence_requested':
        return <Upload className="w-5 h-5 text-amber-600" />;
      case 'responded':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

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
            onClick={() => setActiveTab('new_request')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'new_request'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            New Request ({counts.new_request})
          </button>
          <button
            onClick={() => setActiveTab('to_respond')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'to_respond'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            To Respond ({counts.to_respond})
          </button>
          <button
            onClick={() => setActiveTab('evidence_requested')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'evidence_requested'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Evidence Requested ({counts.evidence_requested})
          </button>
          <button
            onClick={() => setActiveTab('responded')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'responded'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Responded ({counts.responded})
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium">Refund Approved</p>
              <p className="text-2xl font-bold text-blue-700">{counts.responded}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">Return Approved</p>
              <p className="text-2xl font-bold text-orange-700">1</p>
            </div>
            <Package className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium">Negotiation Pending</p>
              <p className="text-2xl font-bold text-red-700">0</p>
            </div>
            <MessageSquare className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium">Evidence Requested</p>
              <p className="text-2xl font-bold text-amber-700">{counts.evidence_requested}</p>
            </div>
            <Upload className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Validation Progress</p>
              <p className="text-2xl font-bold text-purple-700">1</p>
            </div>
            <Eye className="w-8 h-8 text-purple-500 opacity-50" />
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
                  {request.status === 'new_request' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(request, 'evidence')}
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Request Evidence
                      </Button>
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

                  {request.status === 'to_respond' && (
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

                  {request.status === 'evidence_requested' && (
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

                  {request.status === 'responded' && (
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
                    <p className="text-sm font-bold text-red-600 mt-1">
                      Refund: ₱{selectedRequest.refundAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
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
                className={
                  actionType === 'approve'
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : actionType === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-500 hover:bg-amber-600'
                }
              >
                {actionType === 'approve' && 'Approve Refund'}
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
